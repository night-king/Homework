using System;

namespace Homework.Tasks.Dtos;

public class GetJourneyTemplateInput
{
    public Guid JourneyId { get; set; }
    public DayOfWeek? DayOfWeek { get; set; }
}
