using System;

namespace Homework.Tasks.Dtos;

public class GetJourneyTemplateInput
{
    public Guid SharedJourneyId { get; set; }
    public DayOfWeek? DayOfWeek { get; set; }
}
