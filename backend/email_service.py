import os
import base64
import logging
import html as html_escape
import sendgrid
from sendgrid.helpers.mail import Mail as SGMail
from typing import Optional

logger = logging.getLogger(__name__)

# --- Email Helper ---
def send_email(to: str, subject: str, html: str, attachments: Optional[list] = None) -> bool:
    """Send email via SendGrid.

    attachments: list of dicts with keys:
        - content_bytes: bytes
        - filename: str
        - mime_type: str (default image/png)
    """
    api_key = os.environ.get("SENDGRID_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "noreply@arsayatirimzirvesi.com")
    if not api_key:
        logger.warning("SendGrid API key not configured - email not sent (to=%s, subject=%s)", to, subject)
        return False
    try:
        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        msg = SGMail(from_email=sender, to_emails=to, subject=subject, html_content=html)

        # Disable SendGrid link tracking — links should resolve directly to our
        # site (otherwise users land on the click-tracking subdomain).
        from sendgrid.helpers.mail import (
            TrackingSettings, ClickTracking, OpenTracking, SubscriptionTracking
        )
        tracking = TrackingSettings()
        tracking.click_tracking = ClickTracking(False, False)
        tracking.open_tracking = OpenTracking(False)
        tracking.subscription_tracking = SubscriptionTracking(False)
        msg.tracking_settings = tracking

        if attachments:
            from sendgrid.helpers.mail import Attachment, FileContent, FileName, FileType, Disposition
            for att in attachments:
                encoded = base64.b64encode(att["content_bytes"]).decode()
                a = Attachment(
                    FileContent(encoded),
                    FileName(att["filename"]),
                    FileType(att.get("mime_type", "image/png")),
                    Disposition("attachment"),
                )
                msg.add_attachment(a)
        resp = sg.send(msg)
        return resp.status_code in [200, 202]
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False


def render_register_confirmation_email(guest: dict, seq_number: int, public_base_url: str) -> tuple[str, str]:
    """Returns (subject, html) for the confirmation email."""
    visit_type = guest.get("visit_type") or "summit"
    is_summit = visit_type == "summit"
    accent = "#D4AF37" if is_summit else "#22316a"
    accent_bg = "#22316a" if is_summit else "#F5E6A3"
    accent_text = "#fff" if is_summit else "#22316a"
    label = "Arsa Yatırım Zirvesi 2026" if is_summit else "8. Gayrimenkul Proje Yatırım Fuarı"
    sub_label = "Konferans · Panel · Networking" if is_summit else "Proje Fuarı · Maket Sergisi"
    venue_info = ("21 Mayıs 2026 · 11:30 - 15:50" if is_summit else "20-21 Mayıs 2026 · 10:00 - 19:00")
    intro = (
        "Arsa Yatırım Zirvesi 2026 konferans programına kaydınız başarıyla alınmıştır."
        if is_summit
        else "8. Gayrimenkul Proje Yatırım Fuarı ziyaretçi kaydınız başarıyla alınmıştır."
    )
    subject = f"Kayıt Onayı · {label}"
    name = (guest.get("name") or "").strip() or "Misafir"
    guest_id = str(guest.get("_id") or "")
    badge_view_url = f"{public_base_url}/api/badge/{guest_id}"

    html = f"""
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#22316a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">

        <!-- Header -->
        <tr><td style="background:{accent_bg};padding:30px 40px;text-align:center;">
          <div style="color:{accent};font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Kayıt Onayı</div>
          <div style="color:{accent_text};font-size:24px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">{label}</div>
          <div style="color:{accent_text};opacity:0.8;font-size:13px;margin-top:4px;">{sub_label}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="font-size:18px;color:#22316a;margin:0 0 16px 0;font-weight:600;">Sayın {html_escape.escape(name)},</p>
          <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 20px 0;">
            {intro} Aşağıda kayıt detaylarınızı bulabilirsiniz. Etkinlik günü <strong>yaka kartınızın çıktısını yanınızda</strong> getirmeniz veya telefonunuzdaki kareyi kayıt masasında okutmanız yeterlidir.
          </p>

          <!-- Info card -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fb;border-left:4px solid {accent};border-radius:6px;margin:24px 0;">
            <tr><td style="padding:18px 22px;">
              <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Sıra Numaranız</div>
              <div style="font-size:24px;color:#22316a;font-weight:700;font-family:Georgia,serif;">#{seq_number}</div>
              <div style="height:1px;background:#e1e3e9;margin:12px 0;"></div>
              <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Etkinlik</div>
              <div style="font-size:14px;color:#22316a;font-weight:600;">{label}</div>
              <div style="font-size:13px;color:#555;margin-top:2px;">{venue_info}</div>
              <div style="font-size:13px;color:#555;">Hilton İstanbul Bosphorus</div>
            </td></tr>
          </table>

          <!-- Badge attachment notice -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:{accent_bg};border-radius:6px;margin:24px 0;">
            <tr><td style="padding:22px;text-align:center;">
              <div style="font-size:12px;color:{accent};text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:8px;">Yaka Kartınız</div>
              <div style="color:{accent_text};font-size:14px;line-height:1.6;margin-bottom:14px;">
                Yaka kartınız bu e-postanın ekinde <strong>PNG dosyası</strong> olarak yer almaktadır.
                Üzerindeki <strong>QR kodu</strong> giriş günü kayıt masasında okutarak hızlıca check-in yapabilirsiniz.
              </div>
              <a href="{badge_view_url}" style="display:inline-block;background:{accent};color:{("#22316a" if is_summit else "#fff")};padding:11px 28px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px;">
                Yaka Kartını Tarayıcıda Aç
              </a>
            </td></tr>
          </table>

          <p style="font-size:13px;color:#888;line-height:1.6;margin:24px 0 0 0;">
            Sorularınız için bize <a href="mailto:noreply@arsayatirimzirvesi.com" style="color:{accent};">noreply@arsayatirimzirvesi.com</a> adresinden ulaşabilirsiniz.<br>
            Etkinlik günü görüşmek üzere!
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e3e9;">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Arsa Yatırım Zirvesi 2026</div>
          <div style="font-size:11px;color:#aaa;margin-top:6px;">FIRAT CONSTRUCTION YAPI A.Ş.</div>
          <div style="font-size:11px;color:#aaa;margin-top:2px;"><a href="https://arsayatirimzirvesi.com" style="color:#aaa;text-decoration:none;">arsayatirimzirvesi.com</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    return subject, html

