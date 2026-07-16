using System;
using System.Collections.Generic;

namespace Homework.Tasks.Dtos;

public class WeekStripDto
{
    /// <summary>连续完成天数（spec §5.3）。由「模板 + 真实任务」当场推导，不读 DailyScore 账本。</summary>
    public int Streak { get; set; }

    public List<WeekDayDto> Days { get; set; } = new();
}

public class WeekDayDto
{
    public DateOnly Date { get; set; }
    public bool IsRestDay { get; set; }
    public int TasksTotal { get; set; }
    public int TasksCompleted { get; set; }
    public bool IsFull { get; set; }
}
