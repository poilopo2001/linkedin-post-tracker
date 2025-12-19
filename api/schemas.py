from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PostCategory(str, Enum):
    recruitment = "recruitment"
    promotional = "promotional"
    thought_leadership = "thought_leadership"
    events = "events"
    csr = "csr"
    internal_news = "internal_news"
    partnerships = "partnerships"


class Sentiment(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


# ============ Company Schemas ============

class CompanyBase(BaseModel):
    name: str
    linkedin_url: str
    industry: Optional[str] = None
    location: str = "Luxembourg"
    employee_count: Optional[int] = None
    website: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    employee_count: Optional[int] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class Company(CompanyBase):
    id: int
    is_active: bool
    created_at: datetime
    last_collected_at: Optional[datetime] = None
    post_count: Optional[int] = None

    class Config:
        from_attributes = True


# ============ Post Schemas ============

class PostBase(BaseModel):
    content: Optional[str] = None
    posted_at: Optional[datetime] = None
    category: Optional[PostCategory] = None
    sentiment: Optional[Sentiment] = None
    confidence_score: Optional[float] = None
    keywords: Optional[str] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    media_type: Optional[str] = None
    url: Optional[str] = None


class PostCreate(PostBase):
    company_id: int
    linkedin_post_id: Optional[str] = None


class Post(PostBase):
    id: int
    company_id: int
    linkedin_post_id: Optional[str] = None
    collected_at: datetime
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Collection Schemas ============

class CollectRequest(BaseModel):
    company_id: Optional[int] = None  # None = toutes les entreprises actives
    max_posts: int = 20
    classify: bool = True


class CollectBatchRequest(BaseModel):
    company_ids: Optional[List[int]] = None  # None = toutes
    max_posts_per_company: int = 10
    classify: bool = True


class CollectionStatus(BaseModel):
    id: int
    company_id: Optional[int]
    started_at: datetime
    completed_at: Optional[datetime]
    posts_collected: int
    status: str
    error_message: Optional[str]

    class Config:
        from_attributes = True


# ============ Trends Schemas ============

class CategoryCount(BaseModel):
    category: str
    count: int
    percentage: float


class SentimentCount(BaseModel):
    sentiment: str
    count: int
    percentage: float


class CompanyActivity(BaseModel):
    company_id: int
    company_name: str
    post_count: int
    avg_engagement: float


class TrendPoint(BaseModel):
    date: str
    category: str
    count: int


class DashboardStats(BaseModel):
    total_companies: int
    active_companies: int
    total_posts: int
    posts_last_7_days: int
    posts_by_category: List[CategoryCount]
    posts_by_sentiment: List[SentimentCount]
    top_companies: List[CompanyActivity]
    recent_trends: List[TrendPoint]


# ============ Filter Schemas ============

class PostFilter(BaseModel):
    company_id: Optional[int] = None
    category: Optional[PostCategory] = None
    sentiment: Optional[Sentiment] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_engagement: Optional[int] = None
    search: Optional[str] = None


# ============ Generator Schemas ============

class ToneOfVoice(str, Enum):
    professional = "professional"
    friendly = "friendly"
    innovative = "innovative"
    authoritative = "authoritative"
    casual = "casual"
    inspiring = "inspiring"


class CompanySize(str, Enum):
    startup = "startup"
    sme = "sme"
    enterprise = "enterprise"


class DraftStatus(str, Enum):
    draft = "draft"
    approved = "approved"
    used = "used"
    archived = "archived"


class TargetAudience(BaseModel):
    roles: List[str] = []
    industries: List[str] = []
    company_sizes: List[str] = []


# User Company Profile
class UserCompanyProfileBase(BaseModel):
    company_name: str
    industry: str
    sub_industry: Optional[str] = None
    company_size: Optional[str] = None
    tone_of_voice: Optional[List[str]] = None
    key_messages: Optional[List[str]] = None
    values: Optional[List[str]] = None
    differentiators: Optional[List[str]] = None
    target_audience: Optional[TargetAudience] = None
    audience_pain_points: Optional[List[str]] = None
    preferred_categories: Optional[List[str]] = None
    excluded_topics: Optional[List[str]] = None
    hashtag_preferences: Optional[List[str]] = None


class UserCompanyProfileCreate(UserCompanyProfileBase):
    pass


class UserCompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    company_size: Optional[str] = None
    tone_of_voice: Optional[List[str]] = None
    key_messages: Optional[List[str]] = None
    values: Optional[List[str]] = None
    differentiators: Optional[List[str]] = None
    target_audience: Optional[TargetAudience] = None
    audience_pain_points: Optional[List[str]] = None
    preferred_categories: Optional[List[str]] = None
    excluded_topics: Optional[List[str]] = None
    hashtag_preferences: Optional[List[str]] = None


class UserCompanyProfile(UserCompanyProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# Post Relevance Score
class PostRelevanceScoreBase(BaseModel):
    overall_relevance: float
    theme_relevance: Optional[float] = None
    audience_relevance: Optional[float] = None
    industry_relevance: Optional[float] = None
    is_company_specific: bool = False
    is_adaptable: bool = True
    universal_theme: Optional[str] = None
    adaptable_elements: Optional[List[str]] = None
    reasoning: Optional[str] = None


class PostRelevanceScoreCreate(PostRelevanceScoreBase):
    post_id: int
    profile_id: int


class PostRelevanceScore(PostRelevanceScoreBase):
    id: int
    post_id: int
    profile_id: int
    scored_at: datetime
    # Include post info when needed
    post_content: Optional[str] = None
    post_category: Optional[str] = None
    post_engagement: Optional[int] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


# Generated Post
class GeneratedPostBase(BaseModel):
    content: str
    hashtags: Optional[List[str]] = None
    call_to_action: Optional[str] = None
    theme: Optional[str] = None
    category: Optional[str] = None
    target_emotion: Optional[str] = None
    predicted_engagement: Optional[float] = None
    authenticity_score: Optional[float] = None


class GeneratedPostCreate(GeneratedPostBase):
    profile_id: int
    inspiration_post_ids: Optional[List[int]] = None


class GeneratedPostUpdate(BaseModel):
    status: DraftStatus


class GeneratedPost(GeneratedPostBase):
    id: int
    profile_id: int
    inspiration_post_ids: Optional[List[int]] = None
    status: str
    generated_at: datetime
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Extracted Theme
class ExtractedThemeBase(BaseModel):
    theme_name: str
    theme_description: Optional[str] = None
    category: Optional[str] = None
    occurrence_count: int = 1
    avg_engagement: Optional[float] = None
    avg_relevance_score: Optional[float] = None
    source_post_ids: Optional[List[int]] = None
    example_angles: Optional[List[str]] = None
    is_trending: bool = False


class ExtractedTheme(ExtractedThemeBase):
    id: int
    profile_id: int
    first_seen_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True


# Request/Response Schemas
class AnalyzeRelevanceRequest(BaseModel):
    category: Optional[str] = None
    min_engagement: Optional[int] = None
    limit: int = 100


class AnalyzeRelevanceResponse(BaseModel):
    total_posts_analyzed: int
    relevant_posts: int
    company_specific_posts: int
    adaptable_posts: int
    avg_relevance: float
    top_themes: List[str]


class GeneratePostsRequest(BaseModel):
    num_posts: int = 3
    category: Optional[str] = None
    theme: Optional[str] = None
    target_emotion: Optional[str] = None


class GeneratePostsResponse(BaseModel):
    generated_posts: List[GeneratedPost]
    inspiration_sources: List[int]
    themes_used: List[str]


# ============ LinkedIn Tracker Schemas ============

class ProfileType(str, Enum):
    person = "person"
    company = "company"


class TrackingFrequency(str, Enum):
    hourly = "hourly"
    daily = "daily"
    weekly = "weekly"


class ScrapeStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class JobType(str, Enum):
    profile = "profile"
    posts = "posts"
    full = "full"


# Tracked Profile Schemas
class TrackedProfileBase(BaseModel):
    linkedin_url: str
    profile_type: ProfileType
    display_name: str
    headline: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    tracking_frequency: TrackingFrequency = TrackingFrequency.daily
    priority: int = 5
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class TrackedProfileCreate(TrackedProfileBase):
    pass


class TrackedProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    tracking_frequency: Optional[TrackingFrequency] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class TrackedProfile(TrackedProfileBase):
    id: int
    follower_count: Optional[int] = None
    connection_count: Optional[int] = None
    profile_image_url: Optional[str] = None
    about: Optional[str] = None
    is_active: bool
    total_posts_tracked: int
    avg_engagement_rate: Optional[float] = None
    created_at: datetime
    last_scraped_at: Optional[datetime] = None
    next_scrape_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrackedProfileWithStats(TrackedProfile):
    """TrackedProfile avec statistiques additionnelles"""
    recent_posts_count: int = 0
    engagement_trend: Optional[str] = None  # "up", "down", "stable"
    last_post_date: Optional[datetime] = None


# Profile Snapshot Schemas
class ProfileSnapshotBase(BaseModel):
    follower_count: Optional[int] = None
    connection_count: Optional[int] = None
    headline: Optional[str] = None
    about_summary: Optional[str] = None


class ProfileSnapshot(ProfileSnapshotBase):
    id: int
    profile_id: int
    raw_data: Optional[str] = None
    changes_detected: Optional[List[str]] = None
    is_significant_change: bool
    scraped_at: datetime
    scrape_duration_ms: Optional[int] = None
    scrape_status: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileChange(BaseModel):
    """Changement detecte entre deux snapshots"""
    field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    is_significant: bool = False


# Tracked Post Schemas
class TrackedPostBase(BaseModel):
    content: Optional[str] = None
    post_url: Optional[str] = None
    posted_at: Optional[datetime] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    media_type: Optional[str] = None
    media_url: Optional[str] = None


class TrackedPostCreate(TrackedPostBase):
    profile_id: int
    linkedin_post_id: Optional[str] = None


class TrackedPost(TrackedPostBase):
    id: int
    profile_id: int
    linkedin_post_id: Optional[str] = None
    category: Optional[str] = None
    sentiment: Optional[str] = None
    confidence_score: Optional[float] = None
    keywords: Optional[List[str]] = None
    hook_type: Optional[str] = None
    structure_type: Optional[str] = None
    cta_type: Optional[str] = None
    content_length: Optional[int] = None
    hashtag_count: Optional[int] = None
    is_new: bool
    first_seen_at: datetime
    engagement_history: Optional[List[dict]] = None
    # Computed
    total_engagement: Optional[int] = None
    profile_name: Optional[str] = None

    class Config:
        from_attributes = True


class TrackedPostWithInsights(TrackedPost):
    """TrackedPost avec les insights de contenu"""
    insights: Optional["PostContentInsight"] = None


# Post Content Insight Schemas
class PostContentInsightBase(BaseModel):
    hook_text: Optional[str] = None
    key_takeaways: Optional[List[str]] = None
    call_to_action: Optional[str] = None
    tone: Optional[str] = None
    readability_score: Optional[float] = None
    emoji_usage: int = 0
    line_break_pattern: Optional[str] = None
    predicted_engagement: Optional[float] = None
    engagement_drivers: Optional[List[str]] = None
    adaptability_score: Optional[float] = None
    adaptation_suggestions: Optional[List[str]] = None


class PostContentInsightCreate(PostContentInsightBase):
    post_id: int


class PostContentInsight(PostContentInsightBase):
    id: int
    post_id: int
    analyzed_at: datetime

    class Config:
        from_attributes = True


# Scrape Job Schemas
class ScrapeJobBase(BaseModel):
    job_type: JobType
    scheduled_at: Optional[datetime] = None


class ScrapeJobCreate(ScrapeJobBase):
    profile_id: Optional[int] = None


class ScrapeJob(ScrapeJobBase):
    id: int
    profile_id: Optional[int] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    items_scraped: Optional[int] = 0
    new_items_found: Optional[int] = 0
    changes_detected: Optional[int] = 0
    error_message: Optional[str] = None
    retry_count: Optional[int] = 0
    max_retries: Optional[int] = 3
    created_at: datetime
    # Computed
    duration_seconds: Optional[int] = None
    profile_name: Optional[str] = None

    class Config:
        from_attributes = True


# Tracker Request/Response Schemas
class TriggerScrapeRequest(BaseModel):
    job_type: JobType = JobType.full


class BatchScrapeRequest(BaseModel):
    profile_ids: Optional[List[int]] = None  # None = tous les profils actifs dus
    job_type: JobType = JobType.full


class BatchScrapeResponse(BaseModel):
    jobs_created: int
    profile_ids: List[int]
    message: str


class TrackerAnalytics(BaseModel):
    total_profiles: int
    active_profiles: int
    total_posts_tracked: int
    posts_last_7_days: int
    avg_engagement_rate: float
    top_performers: List[dict]
    engagement_by_day: List[dict]


class EngagementTrend(BaseModel):
    date: str
    likes: int
    comments: int
    shares: int
    total: int


class TopPerformer(BaseModel):
    profile_id: int
    profile_name: str
    post_id: int
    content_preview: str
    total_engagement: int
    posted_at: Optional[datetime] = None


class InspirationPost(BaseModel):
    """Post tracke utilisable pour inspiration du generateur"""
    post_id: int
    profile_name: str
    content: str
    category: Optional[str] = None
    hook_type: Optional[str] = None
    structure_type: Optional[str] = None
    engagement: int
    adaptability_score: Optional[float] = None
    adaptation_suggestions: Optional[List[str]] = None


class InspirationResponse(BaseModel):
    posts: List[InspirationPost]
    total_available: int
    filters_applied: dict


# Forward reference update
TrackedPostWithInsights.model_rebuild()
