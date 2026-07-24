using System;
using Homework.Journeys;
using Volo.Abp.Application.Dtos;

namespace Homework.Journeys.Dtos;

public class SharedJourneyDto : EntityDto<Guid>
{
    public Guid ParentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public Guid MedalId { get; set; }
    public SharedJourneyStatus Status { get; set; }
}
