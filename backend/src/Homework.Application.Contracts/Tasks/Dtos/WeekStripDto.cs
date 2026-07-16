using System;
using System.Collections.Generic;

namespace Homework.Tasks.Dtos;

public class WeekStripDto
{
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
