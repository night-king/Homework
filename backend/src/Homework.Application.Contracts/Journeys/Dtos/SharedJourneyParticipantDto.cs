using System;

namespace Homework.Journeys.Dtos;

/// <summary>共享计划的一名参与者：孩子基本信息 + 其旅程当前状态。HasStarted = 已挑宠物并开始（非 Draft）。</summary>
public class SharedJourneyParticipantDto
{
    public Guid ChildId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarKey { get; set; }
    public JourneyStatus Status { get; set; }
    public bool HasStarted { get; set; }
}
