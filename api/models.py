from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Company(Base):
    """Entreprise trackée"""
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    linkedin_url = Column(String(500), unique=True, nullable=False)
    industry = Column(String(255), nullable=True)
    location = Column(String(255), default="Luxembourg")
    employee_count = Column(Integer, nullable=True)
    website = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_collected_at = Column(DateTime, nullable=True)

    # Relation avec les posts
    posts = relationship("Post", back_populates="company", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Company {self.name}>"


class Post(Base):
    """Post LinkedIn"""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    linkedin_post_id = Column(String(255), unique=True, nullable=True)
    content = Column(Text, nullable=True)
    posted_at = Column(DateTime, nullable=True)

    # Classification
    category = Column(String(50), nullable=True)  # recruitment, promotional, etc.
    sentiment = Column(String(20), nullable=True)  # positive, neutral, negative
    confidence_score = Column(Float, nullable=True)
    keywords = Column(Text, nullable=True)  # JSON array stored as string

    # Engagement
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)

    # Métadonnées
    media_type = Column(String(50), nullable=True)
    url = Column(String(500), nullable=True)
    collected_at = Column(DateTime, default=datetime.utcnow)

    # Relation avec l'entreprise
    company = relationship("Company", back_populates="posts")

    def __repr__(self):
        return f"<Post {self.id} - {self.category}>"


class CollectionLog(Base):
    """Log des collectes effectuées"""
    __tablename__ = "collection_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    posts_collected = Column(Integer, default=0)
    status = Column(String(20), default="running")  # running, completed, failed
    error_message = Column(Text, nullable=True)

    def __repr__(self):
        return f"<CollectionLog {self.id} - {self.status}>"


# ============ Generator Models ============

class UserCompanyProfile(Base):
    """Profil de l'entreprise de l'utilisateur pour la génération de posts"""
    __tablename__ = "user_company_profile"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    industry = Column(String(255), nullable=False)
    sub_industry = Column(String(255), nullable=True)
    company_size = Column(String(50), nullable=True)  # startup, sme, enterprise

    # Voice & Tone (JSON stored as string)
    tone_of_voice = Column(Text, nullable=True)  # ["professional", "innovative"]
    key_messages = Column(Text, nullable=True)  # ["message1", "message2", "message3"]
    values = Column(Text, nullable=True)  # ["innovation", "excellence"]
    differentiators = Column(Text, nullable=True)  # ["point1", "point2"]

    # Target Audience (JSON stored as string)
    target_audience = Column(Text, nullable=True)  # {roles: [], industries: []}
    audience_pain_points = Column(Text, nullable=True)  # ["pain1", "pain2"]

    # Content Preferences (JSON stored as string)
    preferred_categories = Column(Text, nullable=True)  # ["thought_leadership", "csr"]
    excluded_topics = Column(Text, nullable=True)  # ["topic1", "topic2"]
    hashtag_preferences = Column(Text, nullable=True)  # ["#innovation", "#tech"]

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relations
    relevance_scores = relationship("PostRelevanceScore", back_populates="profile", cascade="all, delete-orphan")
    generated_posts = relationship("GeneratedPost", back_populates="profile", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<UserCompanyProfile {self.company_name}>"


class PostRelevanceScore(Base):
    """Score de pertinence d'un post concurrent par rapport au profil utilisateur"""
    __tablename__ = "post_relevance_scores"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("user_company_profile.id"), nullable=False)

    # Relevance Metrics (0-100)
    overall_relevance = Column(Float, nullable=False)
    theme_relevance = Column(Float, nullable=True)
    audience_relevance = Column(Float, nullable=True)
    industry_relevance = Column(Float, nullable=True)

    # Classification
    is_company_specific = Column(Boolean, default=False)  # True = event/internal news specific to competitor
    is_adaptable = Column(Boolean, default=True)  # True = theme can be reused

    # Extracted Insights
    universal_theme = Column(String(255), nullable=True)  # "digital transformation"
    adaptable_elements = Column(Text, nullable=True)  # JSON: ["hook", "structure", "cta"]
    reasoning = Column(Text, nullable=True)  # Explanation of the score

    # Metadata
    scored_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    post = relationship("Post")
    profile = relationship("UserCompanyProfile", back_populates="relevance_scores")

    def __repr__(self):
        return f"<PostRelevanceScore post={self.post_id} score={self.overall_relevance}>"


class GeneratedPost(Base):
    """Post LinkedIn généré"""
    __tablename__ = "generated_posts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_company_profile.id"), nullable=False)

    # Content
    content = Column(Text, nullable=False)
    hashtags = Column(Text, nullable=True)  # JSON array
    call_to_action = Column(String(500), nullable=True)

    # Generation Context
    inspiration_post_ids = Column(Text, nullable=True)  # JSON: [1, 5, 12]
    theme = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True)
    target_emotion = Column(String(50), nullable=True)  # inspire, educate, engage

    # Quality Metrics
    predicted_engagement = Column(Float, nullable=True)
    authenticity_score = Column(Float, nullable=True)

    # Status
    status = Column(String(20), default="draft")  # draft, approved, used, archived

    # Metadata
    generated_at = Column(DateTime, default=datetime.utcnow)
    used_at = Column(DateTime, nullable=True)

    # Relations
    profile = relationship("UserCompanyProfile", back_populates="generated_posts")

    def __repr__(self):
        return f"<GeneratedPost {self.id} - {self.status}>"


class ExtractedTheme(Base):
    """Thèmes extraits des posts concurrents"""
    __tablename__ = "extracted_themes"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_company_profile.id"), nullable=False)

    # Theme Info
    theme_name = Column(String(255), nullable=False)
    theme_description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)

    # Statistics
    occurrence_count = Column(Integer, default=1)
    avg_engagement = Column(Float, nullable=True)
    avg_relevance_score = Column(Float, nullable=True)

    # Source Posts (JSON array)
    source_post_ids = Column(Text, nullable=True)  # [1, 5, 12]
    example_angles = Column(Text, nullable=True)  # JSON: ["angle1", "angle2"]

    # Metadata
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    is_trending = Column(Boolean, default=False)

    def __repr__(self):
        return f"<ExtractedTheme {self.theme_name}>"


# ============ LinkedIn Tracker Models ============

class TrackedProfile(Base):
    """Profil LinkedIn (influencer/competitor) a tracker"""
    __tablename__ = "tracked_profiles"

    id = Column(Integer, primary_key=True, index=True)
    linkedin_url = Column(String(500), unique=True, nullable=False)
    profile_type = Column(String(20), nullable=False)  # "person" or "company"
    display_name = Column(String(255), nullable=False)

    # Profile metadata (derniere valeur scrapee)
    headline = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    industry = Column(String(255), nullable=True)
    follower_count = Column(Integer, nullable=True)
    connection_count = Column(Integer, nullable=True)
    profile_image_url = Column(String(500), nullable=True)
    about = Column(Text, nullable=True)

    # Tracking config
    tracking_frequency = Column(String(20), default="daily")  # hourly, daily, weekly
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=5)  # 1-10, higher = more important
    tags = Column(Text, nullable=True)  # JSON array: ["competitor", "influencer"]
    notes = Column(Text, nullable=True)

    # Stats
    total_posts_tracked = Column(Integer, default=0)
    avg_engagement_rate = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_scraped_at = Column(DateTime, nullable=True)
    next_scrape_at = Column(DateTime, nullable=True)

    # Relations
    snapshots = relationship("ProfileSnapshot", back_populates="profile", cascade="all, delete-orphan")
    tracked_posts = relationship("TrackedPost", back_populates="profile", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TrackedProfile {self.display_name}>"


class ProfileSnapshot(Base):
    """Snapshot historique d'un profil LinkedIn"""
    __tablename__ = "profile_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("tracked_profiles.id"), nullable=False)

    # Scraped data (stored as JSON for flexibility)
    raw_data = Column(Text, nullable=True)  # Complete JSON from Bright Data

    # Key metrics at snapshot time
    follower_count = Column(Integer, nullable=True)
    connection_count = Column(Integer, nullable=True)
    headline = Column(String(500), nullable=True)
    about_summary = Column(Text, nullable=True)

    # Change detection
    changes_detected = Column(Text, nullable=True)  # JSON: ["headline", "follower_count"]
    is_significant_change = Column(Boolean, default=False)

    # Metadata
    scraped_at = Column(DateTime, default=datetime.utcnow)
    scrape_duration_ms = Column(Integer, nullable=True)
    scrape_status = Column(String(20), default="success")  # success, partial, failed
    error_message = Column(Text, nullable=True)

    # Relations
    profile = relationship("TrackedProfile", back_populates="snapshots")

    def __repr__(self):
        return f"<ProfileSnapshot profile={self.profile_id} at={self.scraped_at}>"


class TrackedPost(Base):
    """Post LinkedIn d'un profil tracke (influencer/competitor)"""
    __tablename__ = "tracked_posts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("tracked_profiles.id"), nullable=False)
    linkedin_post_id = Column(String(255), unique=True, nullable=True)

    # Content
    content = Column(Text, nullable=True)
    post_url = Column(String(500), nullable=True)
    posted_at = Column(DateTime, nullable=True)

    # Engagement metrics
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)

    # Media
    media_type = Column(String(50), nullable=True)  # text, image, video, document, article
    media_url = Column(String(500), nullable=True)

    # Classification (by our AI)
    category = Column(String(50), nullable=True)
    sentiment = Column(String(20), nullable=True)
    confidence_score = Column(Float, nullable=True)
    keywords = Column(Text, nullable=True)  # JSON array

    # Content Analysis
    hook_type = Column(String(50), nullable=True)  # question, statistic, story, controversial
    structure_type = Column(String(50), nullable=True)  # listicle, narrative, how-to, opinion
    cta_type = Column(String(50), nullable=True)  # question, share, comment, none
    content_length = Column(Integer, nullable=True)
    hashtag_count = Column(Integer, nullable=True)

    # Tracking
    is_new = Column(Boolean, default=True)  # True if detected this scrape cycle
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    engagement_history = Column(Text, nullable=True)  # JSON: [{"date": "...", "likes": 100}]

    # Relations
    profile = relationship("TrackedProfile", back_populates="tracked_posts")
    content_insights = relationship("PostContentInsight", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TrackedPost {self.id} profile={self.profile_id}>"


class PostContentInsight(Base):
    """Insights extraits du contenu d'un post tracke"""
    __tablename__ = "post_content_insights"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("tracked_posts.id"), nullable=False)

    # Content patterns
    hook_text = Column(Text, nullable=True)  # First line/hook
    key_takeaways = Column(Text, nullable=True)  # JSON array
    call_to_action = Column(String(500), nullable=True)

    # Writing style analysis
    tone = Column(String(50), nullable=True)  # professional, casual, inspirational
    readability_score = Column(Float, nullable=True)
    emoji_usage = Column(Integer, default=0)
    line_break_pattern = Column(String(50), nullable=True)  # dense, spaced, mixed

    # Performance correlation
    predicted_engagement = Column(Float, nullable=True)
    engagement_drivers = Column(Text, nullable=True)  # JSON: ["strong_hook", "controversy"]

    # Adaptability for user
    adaptability_score = Column(Float, nullable=True)  # 0-100
    adaptation_suggestions = Column(Text, nullable=True)  # JSON array

    # Metadata
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    post = relationship("TrackedPost", back_populates="content_insights")

    def __repr__(self):
        return f"<PostContentInsight post={self.post_id}>"


class ScrapeJob(Base):
    """Job de scraping planifie ou execute"""
    __tablename__ = "scrape_jobs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("tracked_profiles.id"), nullable=True)

    job_type = Column(String(20), nullable=False)  # profile, posts, full
    status = Column(String(20), default="pending")  # pending, running, completed, failed

    # Execution details
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Results
    items_scraped = Column(Integer, default=0)
    new_items_found = Column(Integer, default=0)
    changes_detected = Column(Integer, default=0)

    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScrapeJob {self.id} type={self.job_type} status={self.status}>"
