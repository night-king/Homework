using System.ComponentModel.DataAnnotations;

namespace Homework.Children.Dtos;

public class SetChildPinDto
{
    /// <summary>4-digit; null/empty clears the PIN.</summary>
    [RegularExpression(@"^\d{4}$", ErrorMessage = "PIN must be 4 digits")]
    public string? Pin { get; set; }
}
