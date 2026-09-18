#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One-off generator for STAGE_CONFIG.js's saga1 (48 real Empire of Cats
Chapter 1 stages), driven by the user's updated guide's real per-stage
table. Not part of the app; run once, paste/verify the output, discard.
"""
import json

# [no, name(prefecture), energyCost, XP, castleHp, stageWidth, maxUnits, boss, enemies(csv), difficultyStars]
STAGES1 = [[1,"長崎県",5,1000,1000,3600,3,"","わんこ,カンバン娘",1],[2,"佐賀県",5,1300,1000,3600,4,"","わんこ,にょろ,カンバン娘",1],[3,"鹿児島県",8,1600,1000,4800,5,"","わんこ,にょろ,カンバン娘",1],[4,"熊本県",8,1900,1000,4800,5,"","わんこ,にょろ,例のヤツ,カンバン娘",1],[5,"宮崎県",10,2200,1500,3600,6,"","わんこ,にょろ,例のヤツ,カンバン娘",1],[6,"大分県",10,2500,1500,5200,7,"","わんこ,にょろ,例のヤツ,カンバン娘",1],[7,"福岡県",16,2800,2400,4800,6,"カバちゃん","わんこ,にょろ,例のヤツ,カンバン娘",2],[8,"高知県",12,3100,1500,3600,5,"","わんこ,にょろ,例のヤツ,カンバン娘",1],[9,"愛媛県",12,3400,3000,6000,10,"","わんこ,にょろ,例のヤツ,カンバン娘",1],[10,"徳島県",14,3700,2500,3800,5,"ブタヤロウ","わんこ,にょろ,例のヤツ,カンバン娘",2],[11,"香川県",18,4000,3500,5000,6,"","わんこ,にょろ,例のヤツ,カバちゃん,カンバン娘",1],[12,"山口県",20,4300,4000,4800,7,"","わんこ,にょろ,例のヤツ,ブタヤロウ,カンバン娘",1],[13,"広島県",18,4600,5000,4800,12,"","わんこ,にょろ,例のヤツ,ジャッキー・ペン,カンバン娘",1],[14,"島根県",20,4900,6000,4800,3,"","わんこ,にょろ,例のヤツ,カバちゃん,カンバン娘",2],[15,"岡山県",24,5200,6100,3600,4,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,カンバン娘",3],[16,"鳥取県",26,5500,7000,4800,6,"ゴリさん","わんこ,例のヤツ,ゴリさん,カンバン娘",3],[17,"兵庫県",20,5800,7000,5000,10,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,ジャッキー・ペン,カンバン娘",2],[18,"和歌山県",24,6100,8000,4800,10,"","わんこ,にょろ,例のヤツ,ブタヤロウ,ジャッキー・ペン,カンバン娘",2],[19,"大阪府",28,6400,9000,3600,10,"","例のヤツ,ゴリさん,メェメェ,カンバン娘",2],[20,"京都府",30,6700,9000,4800,10,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,ゴリさん,メェメェ,カンバン娘",2],[21,"奈良県",24,7000,10000,6000,10,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,メェメェ,カンバン娘",2],[22,"三重県",28,7300,12000,4800,4,"","にょろ,例のヤツ,ジャッキー・ペン,ゴリさん,メェメェ,カンバン娘",3],[23,"滋賀県",32,7600,15000,3200,5,"ゴマさま","例のヤツ,ブタヤロウ,カンバン娘",3],[24,"福井県",40,7900,15000,4800,3,"","カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,カンバン娘",3],[25,"石川県",25,8200,15000,4800,5,"","わんこ,にょろ,例のヤツ,カバちゃん,ジャッキー・ペン,メェメェ,カンバン娘",2],[26,"愛知県",30,8500,15000,3600,20,"","ゴマさま,ワニック,カンバン娘",2],[27,"岐阜県",32,8800,15000,4800,8,"","わんこ,にょろ,例のヤツ,ゴリさん,メェメェ,ゴマさま,ワニック,カンバン娘",3],[28,"富山県",36,9100,15000,4800,8,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,ゴマさま,ワニック,カンバン娘",3],[29,"静岡県",40,9400,18000,4800,10,"パオン","わんこ,にょろ,例のヤツ,ワニック,カンバン娘",4],[30,"山梨県",24,9700,15000,6000,10,"","にょろ,例のヤツ,カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,メェメェ,ゴマさま,ワニック,カンバン娘",3],[31,"長野県",26,10000,8000,6000,10,"","例のヤツ,ブタヤロウ,メェメェ,パオン,ワニック,カンバン娘",2],[32,"新潟県",30,10300,18000,4800,8,"","例のヤツ,ブタヤロウ,ゴマさま,ウサ銀,カンバン娘",3],[33,"神奈川県",35,10600,18000,4000,6,"","にょろ,例のヤツ,カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,メェメェ,ゴマさま,ワニック,カンバン娘",3],[34,"千葉県",28,10900,18000,5200,10,"","にょろ,例のヤツ,カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,メェメェ,ゴマさま,ワニック,カンバン娘",3],[35,"東京都",30,11200,20000,4800,10,"カ・ンガリュ","わんこ,にょろ,例のヤツ,ワニック,ウサ銀,カンバン娘",4],[36,"埼玉県",40,11500,20000,4800,10,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,メェメェ,パオン,ワニック,ウサ銀,カンバン娘",3],[37,"群馬県",30,11800,20000,4800,4,"","わんこ,にょろ,例のヤツ,カバちゃん,ブタヤロウ,メェメェ,カ・ンガリュ,ワニック,ウサ銀,カンバン娘",4],[38,"栃木県",35,12100,20000,4000,8,"ガガガガ","わんこ,例のヤツ,ゴリさん,ワニック,リッスントゥミー,カンバン娘",4],[39,"茨城県",40,12400,20000,4800,5,"","わんこ,にょろ,例のヤツ,ジャッキー・ペン,ゴリさん,ゴマさま,リッスントゥミー,カンバン娘",3],[40,"福島県",30,12700,20000,4800,10,"","わんこ,にょろ,例のヤツ,ジャッキー・ペン,ゴリさん,ゴマさま,パオン,カ・ンガリュ,リッスントゥミー,カンバン娘",3],[41,"宮城県",32,13000,20000,6000,10,"一角くん","例のヤツ,一角くん,ワニック,リッスントゥミー,カンバン娘",4],[42,"山形県",35,13300,25000,4800,5,"","わんこ,にょろ,例のヤツ,ジャッキー・ペン,ゴリさん,ゴマさま,パオン,カ・ンガリュ,リッスントゥミー,カンバン娘",4],[43,"岩手県",30,13600,20000,4800,10,"","わんこ,にょろ,例のヤツ,ブタヤロウ,ゴマさま,一角くん,ワニック,ウサ銀,カンバン娘",3],[44,"秋田県",32,13900,25000,5000,4,"クマ先生","わんこ,にょろ,例のヤツ,リッスントゥミー,カンバン娘",5],[45,"青森県",40,14200,20000,4800,2,"","カバちゃん,ブタヤロウ,ジャッキー・ペン,ゴリさん,ゴマさま,パオン,カ・ンガリュ,カンバン娘",4],[46,"北海道",50,14500,20000,4800,10,"","ブタヤロウ,クマ先生,ウサ銀,リッスントゥミー,ガガガガ,カンバン娘",3],[47,"沖縄県",50,14800,30000,6000,3,"","例のヤツ,カバちゃん,ジャッキー・ペン,ゴリさん,ゴマさま,パオン,カ・ンガリュ,一角くん,クマ先生,カンバン娘",5],[48,"西表島",50,15100,99999,4000,4,"カオル君","例のヤツ,カバちゃん,ジャッキー・ペン,ゴリさん,カ・ンガリュ,カンバン娘",5]]

NAME_TO_KEY = {
    "わんこ": "basic", "にょろ": "fast", "例のヤツ": "thatguy", "カバちゃん": "tank",
    "ブタヤロウ": "aoe", "ジャッキー・ペン": "sniper", "ゴリさん": "gory",
    "メェメェ": "mehmeh", "ゴマさま": "support", "ワニック": "wanikun",
    "パオン": "ranged", "ウサ銀": "usagin", "カ・ンガリュ": "kangaroo",
    "一角くん": "ikkaku", "リッスントゥミー": "swarm", "クマ先生": "guardian",
    "ガガガガ": "gagagaga", "カオル君": "titan", "カンバン娘": "kanban",
}

PREFECTURE_EN = {
    "長崎県": "Nagasaki", "佐賀県": "Saga", "鹿児島県": "Kagoshima", "熊本県": "Kumamoto",
    "宮崎県": "Miyazaki", "大分県": "Oita", "福岡県": "Fukuoka", "高知県": "Kochi",
    "愛媛県": "Ehime", "徳島県": "Tokushima", "香川県": "Kagawa", "山口県": "Yamaguchi",
    "広島県": "Hiroshima", "島根県": "Shimane", "岡山県": "Okayama", "鳥取県": "Tottori",
    "兵庫県": "Hyogo", "和歌山県": "Wakayama", "大阪府": "Osaka", "京都府": "Kyoto",
    "奈良県": "Nara", "三重県": "Mie", "滋賀県": "Shiga", "福井県": "Fukui",
    "石川県": "Ishikawa", "愛知県": "Aichi", "岐阜県": "Gifu", "富山県": "Toyama",
    "静岡県": "Shizuoka", "山梨県": "Yamanashi", "長野県": "Nagano", "新潟県": "Niigata",
    "神奈川県": "Kanagawa", "千葉県": "Chiba", "東京都": "Tokyo", "埼玉県": "Saitama",
    "群馬県": "Gunma", "栃木県": "Tochigi", "茨城県": "Ibaraki", "福島県": "Fukushima",
    "宮城県": "Miyagi", "山形県": "Yamagata", "岩手県": "Iwate", "秋田県": "Akita",
    "青森県": "Aomori", "北海道": "Hokkaido", "沖縄県": "Okinawa", "西表島": "Iriomote Island",
}

STARTING_MONEY = 6000
MONEY_ACCRUAL = 170
BASE_HP = 1000

def js_str(s):
    return "'" + s.replace("'", "\\'") + "'"

def gen_stage(row):
    no, name, energy, xp, castle_hp, width, max_units, boss, enemies_csv, stars = row
    enemy_names = [e for e in enemies_csv.split(",") if e]
    # boss and its own regular-roster appearance (some bosses ALSO appear as a
    # named entry in the enemies list, e.g. stage11's カバちゃん) are handled
    # separately: boss gets a baseHpPercentTrigger:99 entry; every OTHER
    # (non-boss) name in the list gets a timed introduction.
    regular = [e for e in enemy_names if e != boss]

    lines = []
    lines.append(f"  {{")
    lines.append(f"    id: 'stage{no}',")
    lines.append(f"    saga: 'saga1',")
    lines.append(f"    displayName: {js_str(PREFECTURE_EN.get(name, name))},")
    diff_label = 'Boss' if boss else ('Hard' if stars >= 4 else ('Normal' if stars >= 2 else 'Easy'))
    lines.append(f"    difficulty: {js_str(diff_label)},")
    lines.append(f"    baseXp: {xp},")
    lines.append(f"    energyCost: {energy},")
    lines.append(f"    gemsFirstClear: {20 + no * 15},")
    lines.append(f"    startingMoney: {STARTING_MONEY},")
    lines.append(f"    moneyAccrualPerSec: {MONEY_ACCRUAL},")
    lines.append(f"    baseHp: {BASE_HP},")
    # GameScene.js's own DEFAULT_MAX_DEPLOYED is 20 — the real data's own
    # range is "2〜20" (guide's own words), so ANY real value below 20 is a
    # genuine tighter cap that needs an explicit restriction to actually
    # take effect; only max_units == 20 needs no override (bug fixed after
    # an earlier `< 10` threshold silently dropped every real 10-19 cap —
    # 17 of the 48 stages, e.g. every real "出撃最大数: 10" stage).
    if max_units < 20:
        lines.append(f"    restrictions: {{ maxDeployed: {max_units} }},")
    lines.append(f"    enemyBaseHp: {castle_hp},")
    lines.append(f"    spawnScript: [")

    delay = 1500
    STEP = 2600
    for i, ename in enumerate(regular):
        key = NAME_TO_KEY[ename]
        lines.append(f"      {{ enemyId: {js_str(key)}, statMultiplier: 1, spawnDelayMs: {delay} }},")
        # one repeat wave for everything except the very last (trickle
        # fallback continues the last entry's type once the script ends —
        # see STAGE_CONFIG.js's own scheduleTrickleWave).
        if i < len(regular) - 1:
            lines.append(f"      {{ enemyId: {js_str(key)}, statMultiplier: 1, spawnDelayMs: {delay + STEP // 2} }},")
        delay += STEP

    if boss:
        boss_key = NAME_TO_KEY[boss]
        lines.append(f"      {{ enemyId: {js_str(boss_key)}, statMultiplier: 1, baseHpPercentTrigger: 99, isBoss: true }},")

    lines.append(f"    ],")
    lines.append(f"  }},")
    return "\n".join(lines)

def main():
    out = []
    for row in STAGES1:
        out.append(gen_stage(row))
    print(",\n".join([]) )  # noop
    print("\n".join(out))

if __name__ == "__main__":
    main()
