using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Children.Dtos;

public class ChildProfileDto : EntityDto<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string? AvatarKey { get; set; }
    public bool HasPin { get; set; }          // never expose the raw PIN
    public Guid IdentityUserId { get; set; }
}
