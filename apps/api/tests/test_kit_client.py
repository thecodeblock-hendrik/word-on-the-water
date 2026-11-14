import json

import httpx
import pytest

from app.integrations.kit.client import KitClient, KitError, KitRateLimitedError

API_KEY = "kit-secret-key"
EMAIL = "reader@example.com"


class FakeKit:
    """Records the requests and answers like Kit's API v4 (statuses as seen in the spike)."""

    def __init__(self, *, create: int = 201, add: int = 201, broadcast: int = 201) -> None:
        self.requests: list[httpx.Request] = []
        self._create = create
        self._add = add
        self._broadcast = broadcast

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/v4/broadcasts":
            return httpx.Response(self._broadcast, json={"broadcast": {"id": 27039164}})
        if request.url.path == "/v4/subscribers":
            return httpx.Response(self._create, json={"subscriber": {"id": 4242}})
        return httpx.Response(self._add, json={"subscriber": {"id": 4242}})

    def client(self, form_id: int = 99) -> KitClient:
        http = httpx.AsyncClient(transport=httpx.MockTransport(self))
        return KitClient(API_KEY, form_id, client=http)


def body(request: httpx.Request) -> dict[str, object]:
    sent: dict[str, object] = json.loads(request.content)
    return sent


async def test_create_subscriber_is_unconfirmed_and_returns_the_id() -> None:
    kit = FakeKit()
    subscriber_id = await kit.client().create_subscriber(EMAIL, "Ann")

    request = kit.requests[0]
    assert subscriber_id == 4242
    assert (request.method, str(request.url)) == ("POST", "https://api.kit.com/v4/subscribers")
    assert request.headers["x-kit-api-key"] == API_KEY
    assert body(request) == {"email_address": EMAIL, "first_name": "Ann", "state": "inactive"}


async def test_create_subscriber_leaves_out_a_missing_first_name() -> None:
    kit = FakeKit()
    await kit.client().create_subscriber(EMAIL, None)
    assert body(kit.requests[0]) == {"email_address": EMAIL, "state": "inactive"}


async def test_an_existing_subscriber_answers_200_and_still_gives_the_id() -> None:
    assert await FakeKit(create=200).client().create_subscriber(EMAIL, None) == 4242


async def test_add_to_form_posts_the_referrer_to_the_form_by_id() -> None:
    kit = FakeKit()
    await kit.client(form_id=99).add_to_form(4242, "https://wordonthewater.net/")

    request = kit.requests[0]
    assert str(request.url) == "https://api.kit.com/v4/forms/99/subscribers/4242"
    assert body(request) == {"referrer": "https://wordonthewater.net/"}


async def test_adding_twice_is_fine_because_kit_answers_200() -> None:
    await FakeKit(add=200).client().add_to_form(4242, "https://wordonthewater.net/")


async def test_subscribe_creates_then_adds_with_the_id_from_the_first_call() -> None:
    kit = FakeKit()
    subscriber_id = await kit.client().subscribe(EMAIL, "Ann", "https://wordonthewater.net/")

    assert subscriber_id == 4242
    assert [r.url.path for r in kit.requests] == [
        "/v4/subscribers",
        "/v4/forms/99/subscribers/4242",
    ]


async def test_subscribe_does_not_add_to_the_form_when_the_create_fails() -> None:
    kit = FakeKit(create=500)
    with pytest.raises(KitError):
        await kit.client().subscribe(EMAIL, None, "https://wordonthewater.net/")
    assert len(kit.requests) == 1


@pytest.mark.parametrize("status", [401, 404, 422, 500, 503])
async def test_a_failed_call_raises_without_the_address_or_the_key(status: int) -> None:
    kit = FakeKit(create=status)
    with pytest.raises(KitError) as exc:
        await kit.client().create_subscriber(EMAIL, "Ann")
    assert str(status) in str(exc.value)
    assert EMAIL not in str(exc.value) and API_KEY not in str(exc.value)


async def test_too_many_requests_is_its_own_error_so_the_outbox_can_back_off() -> None:
    with pytest.raises(KitRateLimitedError):
        await FakeKit(create=429).client().create_subscriber(EMAIL, None)
    assert issubclass(KitRateLimitedError, KitError)


SENDER = "hello@wordonthewater.net"


async def create_draft(kit: FakeKit, tag_id: int | None = 555) -> int:
    return await kit.client().create_broadcast(
        subject="More than watchmen",
        preview_text="Advent, day one",
        description="Devotional: advent-01-more-than-watchmen",
        content="<h1>More than watchmen</h1><p>Text.</p>",
        email_address=SENDER,
        tag_id=tag_id,
    )


async def test_create_broadcast_posts_a_full_draft_and_returns_the_id() -> None:
    kit = FakeKit()
    broadcast_id = await create_draft(kit)

    request = kit.requests[0]
    assert broadcast_id == 27039164
    assert (request.method, str(request.url)) == ("POST", "https://api.kit.com/v4/broadcasts")
    assert request.headers["x-kit-api-key"] == API_KEY
    assert body(request) == {
        "subject": "More than watchmen",
        "preview_text": "Advent, day one",
        "description": "Devotional: advent-01-more-than-watchmen",
        "content": "<h1>More than watchmen</h1><p>Text.</p>",
        "email_address": SENDER,
        "public": False,
        "send_at": None,
        "subscriber_filter": [{"all": [{"type": "tag", "ids": [555]}]}],
    }


async def test_create_broadcast_is_never_scheduled_or_public() -> None:
    kit = FakeKit()
    await create_draft(kit)
    sent = body(kit.requests[0])
    assert sent["send_at"] is None and sent["public"] is False


async def test_create_broadcast_without_a_tag_names_all_subscribers_explicitly() -> None:
    kit = FakeKit()
    await create_draft(kit, tag_id=None)
    assert body(kit.requests[0])["subscriber_filter"] == [{"all": [{"type": "all_subscribers"}]}]


@pytest.mark.parametrize("status", [401, 422, 500])
async def test_a_failed_broadcast_raises_without_the_key_or_the_content(status: int) -> None:
    with pytest.raises(KitError) as exc:
        await create_draft(FakeKit(broadcast=status))
    assert str(status) in str(exc.value)
    assert API_KEY not in str(exc.value) and "watchmen" not in str(exc.value)


async def test_a_rate_limited_broadcast_is_retryable() -> None:
    with pytest.raises(KitRateLimitedError):
        await create_draft(FakeKit(broadcast=429))
