using System.ComponentModel.DataAnnotations;

namespace Homework.Tasks.Dtos;

public class UpdateDailyTaskDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
}
