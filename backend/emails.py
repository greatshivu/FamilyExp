"""Email service — uses SendGrid if SENDGRID_API_KEY is set, otherwise logs."""
import os
import logging
from typing import Optional

logger = logging.getLogger("family.email")

APP_NAME = "Family Exponse"

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    _BREVO_AVAILABLE = True
except ImportError:
    _BREVO_AVAILABLE = False


def _get_sender() -> Optional[str]:
    return os.environ.get("SENDER_EMAIL")


def _enabled() -> bool:
    return (
        bool(os.environ.get("BREVO_API_KEY"))
        and bool(_get_sender())
        and _BREVO_AVAILABLE
    )


def send_email(to: str, subject: str, html: str) -> bool:
    """Best-effort send. Returns True if delivered, False if skipped/failed.
    Always logs the email content (useful before Brevo is configured)."""

    sender = _get_sender() or "no-reply@farm-ledger.local"

    logger.info(f"[EMAIL] to={to} subject={subject!r} sender={sender}")
    logger.debug(f"[EMAIL BODY]\n{html}")

    if not _enabled():
        logger.info("[EMAIL] Brevo not configured — email skipped (logged only)")
        return False

    try:
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key["api-key"] = os.environ["BREVO_API_KEY"]

        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )

        email = sib_api_v3_sdk.SendSmtpEmail(
            sender={
                "name": APP_NAME,
                "email": sender
            },
            to=[
                {
                    "email": to
                }
            ],
            subject=subject,
            html_content=html
        )

        api_instance.send_transac_email(email)

        logger.info("[EMAIL] Email sent successfully via Brevo")
        return True

    except ApiException as e:
        logger.error(f"[EMAIL] Brevo API error: {e}")
        return False

    except Exception as e:
        logger.error(f"[EMAIL] send failure: {e}")
        return False


def _wrap(title: str, body_html: str, cta_label: Optional[str] = None, cta_url: Optional[str] = None) -> str:
    cta = ""
    if cta_label and cta_url:
        cta = f'''<p style="margin:24px 0;"><a href="{cta_url}" style="background:#2D4C3B;color:#F5F4F0;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">{cta_label}</a></p>'''
    return f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;background:#F5F4F0;padding:32px;border-radius:8px;color:#1C1F1D">
      <div style="font-weight:800;font-size:18px;color:#2D4C3B;margin-bottom:8px">🌿 {APP_NAME}</div>
      <h2 style="margin:0 0 16px 0">{title}</h2>
      {body_html}
      {cta}
      <hr style="border:none;border-top:1px solid #DCD7CB;margin:24px 0"/>
      <div style="color:#5C635F;font-size:12px">{APP_NAME} · Family Expense Manager</div>
    </div>
    """


def email_account_created(to: str, name: str) -> bool:
    return send_email(
        to,
        f"{APP_NAME}: account created — awaiting approval",
        _wrap("Welcome aboard 🌱",
              f"<p>Hi {name},</p><p>Your account on <b>{APP_NAME}</b> has been created. "
              "An administrator will review and approve it shortly. We will email you the moment it is approved.</p>"),
    )


def email_admin_new_signup(admin_email: str, new_user_name: str, new_user_email: str, frontend_url: str) -> bool:
    return send_email(
        admin_email,
        f"{APP_NAME}: new partner sign-up — {new_user_name}",
        _wrap("New partner is waiting for approval",
              f"<p><b>{new_user_name}</b> ({new_user_email}) just signed up and needs approval.</p>",
              "Open Accounts", f"{frontend_url}/admin/accounts"),
    )


def email_account_approved(to: str, name: str, frontend_url: str) -> bool:
    return send_email(
        to,
        f"{APP_NAME}: your account is approved 🎉",
        _wrap("You're approved!",
              f"<p>Hi {name},</p><p>Your <b>{APP_NAME}</b> account has been approved. You can now sign in and start managing the farm.</p>",
              "Sign in", f"{frontend_url}/login"),
    )


def email_account_rejected(to: str, name: str) -> bool:
    return send_email(
        to,
        f"{APP_NAME}: account application not approved",
        _wrap("Account not approved",
              f"<p>Hi {name},</p><p>Unfortunately your application for <b>{APP_NAME}</b> was not approved at this time. Please contact the farm admin if you believe this was a mistake.</p>"),
    )


def email_account_deleted(to: str, name: str) -> bool:
    return send_email(
        to,
        f"{APP_NAME}: your account has been removed",
        _wrap("Account removed",
              f"<p>Hi {name},</p><p>Your <b>{APP_NAME}</b> account has been removed by an administrator. You will no longer be able to sign in.</p>"),
    )


def email_password_reset(to: str, name: str, reset_url: str) -> bool:
    return send_email(
        to,
        f"{APP_NAME}: reset your password",
        _wrap("Password reset request",
              f"<p>Hi {name},</p><p>A password reset was requested for your account. The link below expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>",
              "Reset password", reset_url),
    )
