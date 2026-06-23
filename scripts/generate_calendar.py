#!/usr/bin/env python3
"""从 plans.json 生成 calendar.ics（供 iPhone 订阅，自动同步）"""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
PLANS = ROOT / "data" / "plans.json"
OUT = ROOT / "calendar.ics"

KEY_TAGS = {"睡眠"}
KEY_KEYWORDS = ("练前", "练后", "午饭", "入睡", "起床", "午睡", "腹肌", "正餐")


def is_key_item(item: dict) -> bool:
    if item.get("tag") in KEY_TAGS:
        return True
    title = item.get("title", "")
    return any(k in title for k in KEY_KEYWORDS)


def ics_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def add_minutes(hhmm: str, mins: int) -> str:
    h, m = map(int, hhmm.split(":"))
    total = h * 60 + m + mins
    return f"{total // 60:02d}:{total % 60:02d}"


def generate() -> None:
    data = json.loads(PLANS.read_text(encoding="utf-8"))
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Rike//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:日课",
        "X-WR-TIMEZONE:Asia/Shanghai",
        "REFRESH-INTERVAL;VALUE=DURATION:PT3H",
        "X-PUBLISHED-TTL:PT3H",
    ]

    for date in sorted(data["plans"]):
        plan = data["plans"][date]
        d = date.replace("-", "")
        for i, item in enumerate(plan["items"]):
            start = item["time"]
            end = item.get("end") or add_minutes(start, 15)
            if time_to_min(end) <= time_to_min(start) and item.get("end"):
                end = add_minutes(start, 30)
            uid = f"{date}-{i}@rike"
            summary = ics_escape(item["title"])
            desc = ics_escape(item.get("detail") or "")
            tag = item.get("tag", "")
            if tag:
                desc = ics_escape(f"[{tag}] ") + desc if desc else ics_escape(f"[{tag}]")

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTART;TZID=Asia/Shanghai:{d}T{start.replace(':', '')}00",
                f"DTEND;TZID=Asia/Shanghai:{d}T{end.replace(':', '')}00",
                f"SUMMARY:{summary}",
            ])
            if desc:
                lines.append(f"DESCRIPTION:{desc}")

            triggers = ["-PT10M", "-PT0M"] if is_key_item(item) else ["-PT0M"]
            for tri in triggers:
                label = "即将开始" if tri == "-PT10M" else "现在开始"
                lines.extend([
                    "BEGIN:VALARM",
                    f"TRIGGER:{tri}",
                    "ACTION:DISPLAY",
                    f"DESCRIPTION:{label}：{summary}",
                    "END:VALARM",
                ])
            lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    OUT.write_text("\r\n".join(lines) + "\r\n", encoding="utf-8")
    print(f"已生成 {OUT}（{len(data['plans'])} 天）")


def time_to_min(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


if __name__ == "__main__":
    generate()