using System;

namespace Homework.Tasks.Dtos;

public class GetWeeklyTemplateInput
{
    public Guid ChildId { get; set; }
    public DayOfWeek? DayOfWeek { get; set; }
}
