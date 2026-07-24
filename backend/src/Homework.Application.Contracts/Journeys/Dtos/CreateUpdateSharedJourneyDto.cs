using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class CreateUpdateSharedJourneyDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(512)] public string? Description { get; set; }
    [Required] public DateOnly StartDate { get; set; }
    [Required] public DateOnly EndDate { get; set; }
    [Required] public Guid MedalId { get; set; }
}
