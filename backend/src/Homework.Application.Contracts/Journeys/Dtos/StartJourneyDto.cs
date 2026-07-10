using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Journeys.Dtos;

public class StartJourneyDto
{
    [Required] public Guid ChildId { get; set; }
    [Required] public Guid JourneyId { get; set; }
    [Required] public Guid PetSpeciesId { get; set; }
}
