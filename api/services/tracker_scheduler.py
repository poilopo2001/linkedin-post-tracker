"""
Tracker Scheduler - Background service for automated profile scraping
"""
import asyncio
import subprocess
import os
import json
from datetime import datetime, timedelta
from typing import List, Optional, Callable
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TrackerScheduler")


class TrackerScheduler:
    """
    Background scheduler that periodically checks for profiles
    that need to be scraped and triggers the TypeScript workflow.
    """

    def __init__(self, db_factory: Callable[[], Session]):
        """
        Initialize scheduler with database session factory.

        Args:
            db_factory: Function that returns a new database session
        """
        self.db_factory = db_factory
        self.running = False
        self.check_interval = 300  # 5 minutes between checks
        self.batch_size = 10  # Max profiles per batch
        self.project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

    async def start(self):
        """Start the scheduler loop"""
        self.running = True
        logger.info("TrackerScheduler started")

        while self.running:
            try:
                await self.check_and_run_scrapes()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")

            await asyncio.sleep(self.check_interval)

    def stop(self):
        """Stop the scheduler"""
        self.running = False
        logger.info("TrackerScheduler stopped")

    async def check_and_run_scrapes(self):
        """Check for due profiles and trigger scraping"""
        # db_factory is SessionLocal, call it to get a session
        db = self.db_factory()
        try:
            # Find profiles that need scraping
            now = datetime.utcnow()
            profiles = db.execute(text("""
                SELECT id, display_name, tracking_frequency
                FROM tracked_profiles
                WHERE is_active = 1
                  AND (next_scrape_at IS NULL OR next_scrape_at <= :now)
                ORDER BY priority DESC, last_scraped_at ASC NULLS FIRST
                LIMIT :limit
            """), {"now": now.isoformat(), "limit": self.batch_size}).fetchall()

            if not profiles:
                logger.debug("No profiles due for scraping")
                return

            profile_ids = [p[0] for p in profiles]
            profile_names = [p[1] for p in profiles]

            logger.info(f"Found {len(profiles)} profiles to scrape: {profile_names}")

            # Run batch scrape
            await self.run_batch_scrape(profile_ids)

            # Update next_scrape_at for each profile
            for profile_id, display_name, frequency in profiles:
                next_scrape = self.calculate_next_scrape(frequency)
                db.execute(text("""
                    UPDATE tracked_profiles
                    SET next_scrape_at = :next_scrape
                    WHERE id = :id
                """), {"next_scrape": next_scrape.isoformat(), "id": profile_id})

            db.commit()
            logger.info(f"Updated next_scrape_at for {len(profiles)} profiles")

        except Exception as e:
            logger.error(f"Error checking for scrapes: {e}")
            db.rollback()
        finally:
            db.close()

    def calculate_next_scrape(self, frequency: str) -> datetime:
        """Calculate the next scrape time based on frequency"""
        now = datetime.utcnow()

        if frequency == "hourly":
            return now + timedelta(hours=1)
        elif frequency == "daily":
            return now + timedelta(days=1)
        elif frequency == "weekly":
            return now + timedelta(weeks=1)
        else:
            # Default to daily
            return now + timedelta(days=1)

    async def run_batch_scrape(self, profile_ids: List[int]):
        """Execute the TypeScript workflow for batch scraping"""
        try:
            ids_json = json.dumps(profile_ids)
            cmd = f'npx tsx src/workflow-tracker.ts batch {ids_json}'

            logger.info(f"Running batch scrape: {cmd}")

            # Run in a separate thread to not block the event loop
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
                env=os.environ.copy()
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=600  # 10 minute timeout
            )

            if process.returncode != 0:
                logger.error(f"Batch scrape failed: {stderr.decode('utf-8', errors='replace')}")
            else:
                output = stdout.decode('utf-8', errors='replace')
                logger.info(f"Batch scrape completed: {output[:500] if output else 'No output'}")

        except asyncio.TimeoutError:
            logger.error("Batch scrape timed out after 10 minutes")
        except Exception as e:
            logger.error(f"Error running batch scrape: {e}")

    async def run_single_scrape(self, profile_id: int):
        """Execute scrape for a single profile (for manual triggers)"""
        try:
            cmd = f'npx tsx src/workflow-tracker.ts scrape {profile_id}'

            logger.info(f"Running single scrape for profile {profile_id}")

            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
                env=os.environ.copy()
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=300  # 5 minute timeout
            )

            if process.returncode != 0:
                error_msg = stderr.decode('utf-8', errors='replace')
                logger.error(f"Single scrape failed for profile {profile_id}: {error_msg}")
                return {"success": False, "error": error_msg}
            else:
                output = stdout.decode('utf-8', errors='replace')
                logger.info(f"Single scrape completed for profile {profile_id}")
                return {"success": True, "output": output}

        except asyncio.TimeoutError:
            logger.error(f"Single scrape timed out for profile {profile_id}")
            return {"success": False, "error": "Timeout after 5 minutes"}
        except Exception as e:
            logger.error(f"Error running single scrape for profile {profile_id}: {e}")
            return {"success": False, "error": str(e)}

    async def run_content_analysis(self, limit: int = 50):
        """Run content analysis on unanalyzed posts"""
        try:
            cmd = f'npx tsx src/workflow-tracker.ts analyze {limit}'

            logger.info(f"Running content analysis for up to {limit} posts")

            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
                env=os.environ.copy()
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=600  # 10 minute timeout
            )

            if process.returncode != 0:
                logger.error(f"Content analysis failed: {stderr.decode('utf-8', errors='replace')}")
                return {"success": False, "error": stderr.decode('utf-8', errors='replace')}
            else:
                output = stdout.decode('utf-8', errors='replace')
                logger.info(f"Content analysis completed")
                return {"success": True, "output": output}

        except asyncio.TimeoutError:
            logger.error("Content analysis timed out")
            return {"success": False, "error": "Timeout after 10 minutes"}
        except Exception as e:
            logger.error(f"Error running content analysis: {e}")
            return {"success": False, "error": str(e)}


# Global scheduler instance
_scheduler: Optional[TrackerScheduler] = None


def get_scheduler() -> Optional[TrackerScheduler]:
    """Get the global scheduler instance"""
    return _scheduler


def init_scheduler(db_factory: Callable[[], Session]) -> TrackerScheduler:
    """Initialize and return the global scheduler"""
    global _scheduler
    _scheduler = TrackerScheduler(db_factory)
    return _scheduler
