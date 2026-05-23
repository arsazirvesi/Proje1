from typing import List, Optional, Any, Annotated
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId

# --- PyObjectId ---
def validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError(f"Invalid ObjectId: {v}")

PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


# --- Pydantic Models ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MemberCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None

class GuestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None
    expectations: Optional[str] = None
    interest_area: Optional[str] = None
    participant_type: Optional[str] = None
    visit_type: Optional[str] = "summit"  # "summit" | "fair" | "seminar"
    seminar_slug: Optional[str] = None  # set when visit_type=seminar (course slug)
    seminar_title: Optional[str] = None  # display title captured at submit time
    invite_code: Optional[str] = None  # required at runtime via validator below

class InviteCodeCreate(BaseModel):
    code: str
    label: Optional[str] = None
    valid_for: str = "both"  # "summit" | "fair" | "both"
    max_uses: int = 0  # 0 = unlimited
    is_active: bool = True
    expires_at: Optional[str] = None  # ISO date or None

class InviteCodeUpdate(BaseModel):
    label: Optional[str] = None
    valid_for: Optional[str] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None

class InviteCodeValidate(BaseModel):
    code: str
    visit_type: str = "summit"

class ApiKeyCreate(BaseModel):
    label: str
    valid_for: str = "both"  # "summit" | "fair" | "both"

class ApiKeyUpdate(BaseModel):
    label: Optional[str] = None
    valid_for: Optional[str] = None
    is_active: Optional[bool] = None

class ExternalCheckInRequest(BaseModel):
    code: str
    mark_checkin: bool = True  # If False, just validate without marking

class ExhibitorCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    sector: Optional[str] = None
    stand_preference: Optional[str] = None
    products_services: Optional[str] = None
    website: Optional[str] = None
    social_media: Optional[str] = None
    notes: Optional[str] = None

class SpeakerApplicationCreate(BaseModel):
    application_type: str  # konusmaci | panelist | sponsor
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    expertise: Optional[str] = None
    topic: Optional[str] = None
    bio: Optional[str] = None
    sponsor_package: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    additional_notes: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str  # new | contacted | approved | rejected | reserved
    admin_notes: Optional[str] = None


class GuestEdit(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None  # NOTE: keep lowercase; collision check applied
    company: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None
    participant_type: Optional[str] = None
    interest: Optional[str] = None
    expectations: Optional[str] = None
    admin_notes: Optional[str] = None
    status: Optional[str] = None
    is_reserved: Optional[bool] = None


class BulkReserveRequest(BaseModel):
    invite_code: str = Field(..., min_length=2, max_length=64)
    count: int = Field(..., ge=1, le=500)
    note: Optional[str] = None

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "admin"  # "admin" | "expert"


class ExpertCommentCreate(BaseModel):
    comment: str = Field(..., min_length=2, max_length=4000)

class AdminPasswordChange(BaseModel):
    new_password: str

class AdminNameUpdate(BaseModel):
    name: str

class SpeakerCreate(BaseModel):
    name: str
    title: str
    bio: str
    image_url: Optional[str] = None
    order: int = 0
    is_featured: bool = False
    social_linkedin: Optional[str] = None
    social_instagram: Optional[str] = None
    social_twitter: Optional[str] = None
    # Zirve Ailesi page fields
    is_founder: bool = False
    summit_years: List[int] = Field(default_factory=list)  # e.g. [2024, 2025, 2026]
    extended_bio: Optional[str] = None  # long-form, shown in detail modal
    show_in_family: bool = True  # if False, hide from /zirve-ailesi
    founder_role: Optional[str] = None  # e.g. "Zirve ve Platform Kurucusu"

class SponsorCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    tier: str = "standard"
    order: int = 0

class BannerCreate(BaseModel):
    title: Optional[str] = ""
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    image_url_mobile: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    is_active: bool = True
    order: int = 0
    # New popup/modal fields
    display_mode: str = "slider"  # "slider" | "modal"
    start_at: Optional[str] = None  # ISO datetime
    end_at: Optional[str] = None    # ISO datetime
    delay_seconds: int = 0          # how long to wait before popup
    pages: List[str] = []           # empty = all pages; values: "home","program","speakers","fair","blog","game"

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    image_url: Optional[str] = None
    author: str = "Admin"
    tags: List[str] = []
    is_published: bool = False

class PastEventCreate(BaseModel):
    title: str
    year: int
    venue: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    attendee_count: Optional[int] = None
    speakers_count: Optional[int] = None
    type: str = "zirve"          # "zirve" | "seminer"
    date_label: Optional[str] = None   # "21 Mayıs 2026"
    topics: List[str] = []             # ["Arsa Yatırım", "Hukuk", ...]
    video_url: Optional[str] = None    # YouTube URL
    highlight_text: Optional[str] = None  # Quote / key highlight

class ProgramSessionCreate(BaseModel):
    time_start: str
    time_end: Optional[str] = ""
    title: str
    speaker_name: Optional[str] = None
    session_type: str = "talk"
    description: Optional[str] = None
    order: int = 0

class EmailBroadcast(BaseModel):
    subject: str
    content: str
    recipient_type: str

class EmailIndividual(BaseModel):
    to_email: str
    subject: str
    content: str


class HeroSlideCreate(BaseModel):
    image_url: str
    title: Optional[str] = None
    order: int = 0
    is_active: bool = True
    opacity: Optional[int] = 45  # 0-100, percent


class SiteSettings(BaseModel):
    """General site-wide settings (event date for countdown, statistics, etc.)"""
    event_datetime: Optional[str] = None  # ISO 8601 with timezone, used by countdown
    event_date_label: Optional[str] = None  # "21 Mayıs 2026" - text label
    event_time_label: Optional[str] = None  # "09:00 - 19:00"
    event_location: Optional[str] = None  # "Hilton İstanbul Bosphorus"
    speakers_count: Optional[int] = None
    sessions_count: Optional[int] = None
    attendees_count: Optional[str] = None  # "600+"
    countdown_title: Optional[str] = None  # "Zirveye Kalan Süre"
    # Event lifecycle: when False, the home page shows a "completed" hero
    event_is_active: Optional[bool] = True
    completed_overline: Optional[str] = None
    completed_title: Optional[str] = None
    completed_subtitle: Optional[str] = None
    completed_thanks_message: Optional[str] = None
    next_event_label: Optional[str] = None
    next_event_cta_text: Optional[str] = None
    next_event_cta_url: Optional[str] = None


class FairSettings(BaseModel):
    fair_name: Optional[str] = None
    subtitle: Optional[str] = None
    dates: Optional[str] = None
    location: Optional[str] = None
    hall_name: Optional[str] = None
    description: Optional[str] = None
    total_stands: Optional[int] = None
    total_size_range: Optional[str] = None
    floor_plan_url: Optional[str] = None  # PDF URL (kroki)
    floor_plan_image_url: Optional[str] = None  # PNG/JPG rendered kroki
    gallery: Optional[List[str]] = None  # image urls
    stand_types: Optional[List[dict]] = None  # [{name, size, count, features}]
    highlights: Optional[List[str]] = None  # bullet list
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None


class SeoSettings(BaseModel):
    site_name: Optional[str] = None
    site_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[str] = None
    author: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    twitter_title: Optional[str] = None
    twitter_description: Optional[str] = None
    twitter_image: Optional[str] = None
    twitter_card: Optional[str] = "summary_large_image"
    google_site_verification: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: Optional[str] = "index, follow"
    favicon_url: Optional[str] = None
    # Analytics & Tag Manager
    gtm_id: Optional[str] = None  # e.g. GTM-XXXXXXX
    ga_id: Optional[str] = None  # e.g. G-XXXXXXXXXX
    meta_pixel_id: Optional[str] = None  # Facebook/Meta Pixel ID
    custom_head_html: Optional[str] = None  # extra <head> snippets
    custom_body_html: Optional[str] = None  # extra <body> top snippets (e.g. GTM noscript)
    # Social media
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_twitter: Optional[str] = None
    social_facebook: Optional[str] = None
    social_youtube: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_whatsapp: Optional[str] = None  # full https://wa.me/...
    invite_code_phone: Optional[str] = None  # phone for invite-code requests (visitor register)
    # Contact
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None
    # Event-specific JSON-LD fields
    event_name: Optional[str] = None
    event_start_date: Optional[str] = None
    event_end_date: Optional[str] = None
    event_location_name: Optional[str] = None
    event_location_address: Optional[str] = None
    event_organizer: Optional[str] = None
    event_organizer_url: Optional[str] = None
    custom_head_html: Optional[str] = None


# --- Investment Game Models ---
class InvestmentItem(BaseModel):
    kind: str  # "daire" | "arsa"
    city: str
    district: str
    budget: int
    # Daire-specific
    daire_type: Optional[str] = None  # "1+1" | "2+1" | "3+1" | "5+1"
    # Arsa / land-specific
    arsa_type: Optional[str] = None  # "arsa" | "tarla" | "ipat"
    neighborhood: Optional[str] = None
    area_m2: Optional[int] = None  # square meters
    vade_years: Optional[float] = None  # 0.5 .. 10
    ownership: Optional[str] = None  # "hisseli" | "mustakil"
    description: Optional[str] = None


class InvestmentGameSubmit(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=6, max_length=30)
    email: EmailStr
    age: int = Field(..., ge=10, le=120)
    profession: str = Field(..., min_length=2, max_length=120)
    total_budget: Optional[int] = None  # user-chosen total budget; required if budget_mode != "free"
    budget_mode: Optional[str] = "free"  # "1m" | "3m" | "5m" | "10m" | "free"
    items: List[InvestmentItem] = Field(default_factory=list)


class InvestmentGameReply(BaseModel):
    subject: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=2, max_length=8000)


