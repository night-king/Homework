using System;

namespace Homework.Scoring;

/// <summary>
/// 每日星星 = ceil(完成比例 × 上限)，封顶 <see cref="ScoringConsts.MaxDailyStars"/>。
/// 公平核心（spec §5.1）：只要各自完成自己的计划就能拿满星，与任务绝对数量无关。
/// total==0（无任务/休息日）返回 0，由上层判定为休息日。
/// </summary>
public static class StarCalculator
{
    public static int CalculateStars(int total, int completed, int maxStars = ScoringConsts.MaxDailyStars)
    {
        if (total <= 0)
        {
            return 0;
        }

        if (completed < 0)
        {
            completed = 0;
        }

        if (completed > total)
        {
            completed = total;
        }

        var stars = (int)Math.Ceiling((double)completed / total * maxStars);
        return Math.Min(stars, maxStars);
    }
}
