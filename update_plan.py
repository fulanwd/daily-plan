#!/usr/bin/env python3
"""Grok 更新计划时用的辅助脚本。用法见脚本末尾说明。"""
import json
import sys
from datetime import datetime
from pathlib import Path

PLANS_FILE = Path(__file__).parent / "data" / "plans.json"


def load():
    with open(PLANS_FILE, encoding="utf-8") as f:
        return json.load(f)


def save(data):
    data["meta"]["updated"] = datetime.now().strftime("%Y-%m-%d")
    with open(PLANS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"已更新 {PLANS_FILE}")


def list_dates(data):
    for d in sorted(data["plans"]):
        p = data["plans"][d]
        print(f"  {d}  {p.get('label','')}  {p.get('title','')}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("每日计划数据工具")
        print("  python3 update_plan.py list")
        print("  python3 update_plan.py add <date.json>")
        sys.exit(0)
    cmd = sys.argv[1]
    data = load()
    if cmd == "list":
        list_dates(data)
    elif cmd == "add" and len(sys.argv) >= 3:
        patch = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
        data["plans"].update(patch)
        save(data)
    else:
        print("未知命令")
        sys.exit(1)