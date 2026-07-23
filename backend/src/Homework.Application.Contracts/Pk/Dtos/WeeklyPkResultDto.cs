using System;
using System.Collections.Generic;

namespace Homework.Pk.Dtos;

/// <summary>本周 PK 榜结果：当前周窗口 + 已排好名次的孩子列表。</summary>
public class WeeklyPkResultDto
{
    public DateOnly WeekStart { get; set; }   // 本周一
    public DateOnly Through { get; set; }      // 计入到哪天（= 今天）
    public List<PkEntryDto> Entries { get; set; } = new();
}
