import httpx
import os
from typing import Dict, Any

# URL de l'API TypeScript
TYPESCRIPT_API_URL = os.getenv("TYPESCRIPT_API_URL", "http://localhost:3001")


async def classify_post_content(content: str) -> Dict[str, Any]:
    """
    Classifie le contenu d'un post via l'API TypeScript.

    Args:
        content: Le contenu du post à classifier

    Returns:
        Dict avec category, sentiment, confidence_score, keywords
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{TYPESCRIPT_API_URL}/classify",
            json={"content": content}
        )
        response.raise_for_status()
        return response.json()
