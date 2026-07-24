using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class AddParticipantsDto
{
    [Required] public Guid SharedJourneyId { get; set; }
    [Required] public List<Guid> ChildIds { get; set; } = new();
}
