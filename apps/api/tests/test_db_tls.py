import ssl

from app.db.session import tls_for


def test_local_database_has_no_tls() -> None:
    assert tls_for("local") is False


def test_deployed_database_verifies_certificate_and_hostname() -> None:
    context = tls_for("preview")
    assert isinstance(context, ssl.SSLContext)
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True
