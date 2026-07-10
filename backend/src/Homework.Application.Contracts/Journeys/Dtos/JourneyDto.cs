using System;
using Homework.Journeys;
using Volo.Abp.Application.Dtos;

namespace Homework.Journeys.Dtos;

public class JourneyDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public Guid MedalId { get; set; }
    public JourneyStatus Status { get; set; }
    public Guid? PetSpeciesId { get; set; }
    public int CurrentLevel { get; set; }
    public int GrowthPoints { get; set; }
    public DateTime? CompletedTime { get; set; }
}
