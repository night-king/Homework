using System.ComponentModel.DataAnnotations;

namespace Homework.Children.Dtos;

public class VerifyChildPinDto
{
    /// <summary>4-digit PIN to check against the child's stored PIN.</summary>
    [Required]
    [RegularExpression(@"^\d{4}$", ErrorMessage = "PIN must be 4 digits")]
    public string Pin { get; set; } = string.Empty;
}
