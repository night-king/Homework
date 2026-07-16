using System;

namespace Homework.Tasks.Dtos;

/// <summary>
/// 用 Input DTO 而非两个裸参数：ABP 约定路由里单个 *Id 参数会被提升成路径段，
/// 两个及以上才全走 query——用对象参数把这个坑绕开（照 GetDailyBoardInput）。
/// </summary>
public class GetWeekStripInput
{
    public Guid ChildId { get; set; }

    /// <summary>一律为周一（原型周条以周一起头）。后端不猜、不纠正，以它为第 0 天连排 7 天。</summary>
    public DateOnly WeekStart { get; set; }
}
