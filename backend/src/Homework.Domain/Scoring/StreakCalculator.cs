using System;
using System.Collections.Generic;
using System.Linq;

namespace Homework.Scoring;

/// <summary>
/// 连续打卡（spec §5.3）：从 today 往前遍历完整账本 ——
/// 吃饱(IsFull) +1；休息日(IsRestDay) 跳过(桥接)；过去的"有任务却没吃饱"(含缺档漏做) 断裂；
/// 今天若还没吃饱则视为进行中，不计入也不断裂。
/// 输入需为覆盖到 today 的无缺口账本（spec §7.7 的补档保证）。
/// </summary>
public static class StreakCalculator
{
    public static int CalculateCurrentStreak(IEnumerable<DailyScoreSnapshot> ledger, DateOnly today)
    {
        var ordered = ledger.Where(x => x.Date <= today).OrderByDescending(x => x.Date);

        var streak = 0;
        foreach (var day in ordered)
        {
            if (day.IsRestDay)
            {
                continue; // 休息日桥接
            }

            if (day.IsFull)
            {
                streak++;
                continue;
            }

            // 有任务却没吃饱
            if (day.Date == today)
            {
                continue; // 今天还在进行中：不计入也不断裂
            }

            break; // 过去的漏做日（含缺档）断裂
        }

        return streak;
    }
}
