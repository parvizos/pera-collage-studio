"""Free, keyless auto-translation of storefront content (on save).

Strategy: translate each user-facing string into RU/EN/TR/AR using the free
Google Translate endpoint, with MyMemory as a fallback. Results are cached in
``home["translations"]`` so re-saves only translate new/changed text.

No API key required. Network failures degrade gracefully (text stays in its
original language).
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

LANGS = ["ru", "en", "tr", "ar"]
# Keys whose string values are user-facing content worth translating.
TEXT_KEYS = {"title", "subtitle", "text", "button", "button2"}

# Curated e-commerce glossary: short CTA/store terms that generic machine
# translation gets wrong out of context (e.g. "GET" -> "взять" instead of
# "заказать"). Keys are normalized (lowercase, trimmed of punctuation). These
# OVERRIDE the machine translation. Add more terms freely.
STORE_GLOSSARY: dict[str, dict[str, str]] = {
    "get": {"ru": "Заказать", "en": "Order now", "tr": "Sipariş ver", "ar": "اطلب الآن"},
    "получить": {"ru": "Заказать", "en": "Order now", "tr": "Sipariş ver", "ar": "اطلب الآن"},
    "order": {"ru": "Заказать", "en": "Order", "tr": "Sipariş ver", "ar": "اطلب"},
    "order now": {"ru": "Заказать", "en": "Order now", "tr": "Sipariş ver", "ar": "اطلب الآن"},
    "заказать": {"ru": "Заказать", "en": "Order now", "tr": "Sipariş ver", "ar": "اطلب الآن"},
    "сделать заказ": {"ru": "Сделать заказ", "en": "Place an order", "tr": "Sipariş ver", "ar": "إجراء طلب"},
    "buy": {"ru": "Купить", "en": "Buy", "tr": "Satın al", "ar": "اشترِ"},
    "buy now": {"ru": "Купить", "en": "Buy now", "tr": "Hemen al", "ar": "اشترِ الآن"},
    "купить": {"ru": "Купить", "en": "Buy", "tr": "Satın al", "ar": "اشترِ"},
    "shop": {"ru": "В каталог", "en": "Shop", "tr": "Alışverişe başla", "ar": "تسوّق"},
    "shop now": {"ru": "Купить", "en": "Shop now", "tr": "Hemen al", "ar": "تسوّق الآن"},
    "add to cart": {"ru": "В корзину", "en": "Add to cart", "tr": "Sepete ekle", "ar": "أضف إلى السلة"},
    "в корзину": {"ru": "В корзину", "en": "Add to cart", "tr": "Sepete ekle", "ar": "أضف إلى السلة"},
    "cart": {"ru": "Корзина", "en": "Cart", "tr": "Sepet", "ar": "السلة"},
    "корзина": {"ru": "Корзина", "en": "Cart", "tr": "Sepet", "ar": "السلة"},
    "checkout": {"ru": "Оформить заказ", "en": "Checkout", "tr": "Ödeme", "ar": "إتمام الطلب"},
    "catalog": {"ru": "Каталог", "en": "Catalog", "tr": "Katalog", "ar": "الكتالوج"},
    "catalogue": {"ru": "Каталог", "en": "Catalog", "tr": "Katalog", "ar": "الكتالوج"},
    "каталог": {"ru": "Каталог", "en": "Catalog", "tr": "Katalog", "ar": "الكتالوج"},
    "в каталог": {"ru": "В каталог", "en": "Shop catalog", "tr": "Kataloğa git", "ar": "إلى الكتالوج"},
    "смотреть каталог": {"ru": "Смотреть каталог", "en": "Browse catalog", "tr": "Kataloğa göz at", "ar": "تصفّح الكتالوج"},
    "sale": {"ru": "Распродажа", "en": "Sale", "tr": "İndirim", "ar": "تخفيضات"},
    "акции": {"ru": "Акции", "en": "Deals", "tr": "Kampanyalar", "ar": "عروض"},
    "распродажа": {"ru": "Распродажа", "en": "Sale", "tr": "İndirim", "ar": "تخفيضات"},
    "new": {"ru": "Новинки", "en": "New", "tr": "Yeni", "ar": "جديد"},
    "new arrivals": {"ru": "Новинки", "en": "New arrivals", "tr": "Yeni ürünler", "ar": "وصل حديثًا"},
    "new drop": {"ru": "Новый дроп", "en": "New drop", "tr": "Yeni koleksiyon", "ar": "تشكيلة جديدة"},
    "новинки": {"ru": "Новинки", "en": "New arrivals", "tr": "Yeni ürünler", "ar": "وصل حديثًا"},
    "view": {"ru": "Смотреть", "en": "View", "tr": "Görüntüle", "ar": "عرض"},
    "view all": {"ru": "Смотреть всё", "en": "View all", "tr": "Tümünü gör", "ar": "عرض الكل"},
    "смотреть": {"ru": "Смотреть", "en": "View", "tr": "İncele", "ar": "عرض"},
    "смотреть всё": {"ru": "Смотреть всё", "en": "View all", "tr": "Tümünü gör", "ar": "عرض الكل"},
    "смотреть коллекцию": {"ru": "Смотреть коллекцию", "en": "View collection", "tr": "Koleksiyonu gör", "ar": "عرض المجموعة"},
    "see more": {"ru": "Показать ещё", "en": "See more", "tr": "Daha fazla gör", "ar": "عرض المزيد"},
    "learn more": {"ru": "Подробнее", "en": "Learn more", "tr": "Daha fazla", "ar": "اعرف المزيد"},
    "подробнее": {"ru": "Подробнее", "en": "Learn more", "tr": "Daha fazla", "ar": "اعرف المزيد"},
    "узнать больше": {"ru": "Узнать больше", "en": "Learn more", "tr": "Daha fazla bilgi", "ar": "اعرف المزيد"},
    "contact": {"ru": "Связаться", "en": "Contact us", "tr": "İletişime geç", "ar": "تواصل معنا"},
    "contact us": {"ru": "Связаться", "en": "Contact us", "tr": "İletişime geç", "ar": "تواصل معنا"},
    "связаться": {"ru": "Связаться", "en": "Contact us", "tr": "İletişime geç", "ar": "تواصل معنا"},
    "написать": {"ru": "Написать", "en": "Message us", "tr": "Bize yazın", "ar": "راسلنا"},
    "написать в whatsapp": {"ru": "Написать в WhatsApp", "en": "Message on WhatsApp", "tr": "WhatsApp'tan yaz", "ar": "راسلنا على واتساب"},
    "wholesale": {"ru": "Опт", "en": "Wholesale", "tr": "Toptan", "ar": "بالجملة"},
    "опт": {"ru": "Опт", "en": "Wholesale", "tr": "Toptan", "ar": "بالجملة"},
    "collection": {"ru": "Коллекция", "en": "Collection", "tr": "Koleksiyon", "ar": "المجموعة"},
    "коллекция": {"ru": "Коллекция", "en": "Collection", "tr": "Koleksiyon", "ar": "المجموعة"},
    "about us": {"ru": "О нас", "en": "About us", "tr": "Hakkımızda", "ar": "من نحن"},
    "о нас": {"ru": "О нас", "en": "About us", "tr": "Hakkımızda", "ar": "من نحن"},
    "о бренде": {"ru": "О бренде", "en": "About the brand", "tr": "Marka hakkında", "ar": "عن العلامة"},
    "free shipping": {"ru": "Бесплатная доставка", "en": "Free shipping", "tr": "Ücretsiz kargo", "ar": "شحن مجاني"},
    "delivery": {"ru": "Доставка", "en": "Delivery", "tr": "Teslimat", "ar": "التوصيل"},
    "доставка": {"ru": "Доставка", "en": "Delivery", "tr": "Teslimat", "ar": "التوصيل"},
    "in stock": {"ru": "В наличии", "en": "In stock", "tr": "Stokta", "ar": "متوفر"},
    "out of stock": {"ru": "Нет в наличии", "en": "Out of stock", "tr": "Tükendi", "ar": "غير متوفر"},
    "sold out": {"ru": "Распродано", "en": "Sold out", "tr": "Tükendi", "ar": "نفد"},
    "subscribe": {"ru": "Подписаться", "en": "Subscribe", "tr": "Abone ol", "ar": "اشترك"},
    "get the discount": {"ru": "Получить скидку", "en": "Get the discount", "tr": "İndirimi al", "ar": "احصل على الخصم"},
    "получить скидку": {"ru": "Получить скидку", "en": "Get the discount", "tr": "İndirimi al", "ar": "احصل على الخصم"},
    "хочу скидку": {"ru": "Хочу скидку", "en": "I want the discount", "tr": "İndirim istiyorum", "ar": "أريد الخصم"},
}


def _normalize_term(s: str) -> str:
    return re.sub(r"^[^0-9A-Za-zА-Яа-яЁё]+|[^0-9A-Za-zА-Яа-яЁё]+$", "", s.strip().lower())

_HAS_LETTER = re.compile(r"[A-Za-zÀ-ɏЀ-ӿ؀-ۿ]")


def _has_letters(s: str) -> bool:
    return bool(_HAS_LETTER.search(s))


def _skip(s: str) -> bool:
    """Skip non-content strings: urls, paths, hex colors, data URIs, icon-only."""
    if not isinstance(s, str):
        return True
    st = s.strip()
    if not st or len(st) > 240:
        return True
    if st.startswith(("http://", "https://", "data:", "/", "#")):
        return True
    if not _has_letters(st):
        return True
    return False


def _google(text: str, tl: str) -> str | None:
    url = (
        "https://translate.googleapis.com/translate_a/single"
        "?client=gtx&sl=auto&tl=%s&dt=t&q=%s" % (tl, urllib.parse.quote(text))
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        out = "".join(seg[0] for seg in data[0] if seg and seg[0])
        return out or None
    except Exception:
        return None


def _mymemory(text: str, tl: str) -> str | None:
    url = (
        "https://api.mymemory.translated.net/get?q=%s&langpair=%s"
        % (urllib.parse.quote(text), urllib.parse.quote("ru|" + tl))
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        out = (data.get("responseData") or {}).get("translatedText")
        if out and "MYMEMORY WARNING" not in out.upper():
            return out
    except Exception:
        pass
    return None


def translate_one(text: str, tl: str) -> str:
    # E-commerce glossary takes precedence for known short terms.
    entry = STORE_GLOSSARY.get(_normalize_term(text))
    if entry and entry.get(tl):
        val = entry[tl]
        # Preserve an all-caps button style (e.g. "GET" -> "ЗАКАЗАТЬ").
        if len(text) > 1 and text == text.upper() and text != text.lower():
            val = val.upper()
        return val
    return _google(text, tl) or _mymemory(text, tl) or text


def _collect(node, out: set) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "translations":
                continue
            if key in TEXT_KEYS and isinstance(value, str) and not _skip(value):
                out.add(value)
            else:
                _collect(value, out)
    elif isinstance(node, list):
        for item in node:
            _collect(item, out)


def needs_translation(home: dict) -> bool:
    """True if any user-facing string is missing a translation for some language."""
    if not isinstance(home, dict):
        return False
    strings: set[str] = set()
    _collect(home, strings)
    existing = home.get("translations")
    existing = existing if isinstance(existing, dict) else {}
    for src in strings:
        cur = existing.get(src)
        cur = cur if isinstance(cur, dict) else {}
        for lang in LANGS:
            if not cur.get(lang):
                return True
    return False


def enrich_home_translations(home: dict, max_new_strings: int = 100) -> dict:
    """Translate every new user-facing string in ``home`` into the 4 languages.

    Caches into ``home['translations']`` = { source_text: {ru,en,tr,ar} }.
    """
    if not isinstance(home, dict):
        return home

    existing = home.get("translations")
    if not isinstance(existing, dict):
        existing = {}

    strings: set[str] = set()
    _collect(home, strings)

    tasks: list[tuple[str, str]] = []
    for src in strings:
        cur = existing.get(src)
        cur = cur if isinstance(cur, dict) else {}
        for lang in LANGS:
            if not cur.get(lang):
                tasks.append((src, lang))

    if not tasks:
        home["translations"] = existing
        return home

    tasks = tasks[: max_new_strings * len(LANGS)]

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(translate_one, src, lang): (src, lang) for src, lang in tasks}
        for fut in as_completed(futures):
            src, lang = futures[fut]
            try:
                value = fut.result()
            except Exception:
                value = src
            if not isinstance(existing.get(src), dict):
                existing[src] = {}
            existing[src][lang] = value

    home["translations"] = existing
    return home
