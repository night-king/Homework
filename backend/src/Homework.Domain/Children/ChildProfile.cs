using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Children;

/// <summary>
/// 孩子的游戏档案（1:1 关联一个 Child 身份用户）。
/// spec §6 的 CreatedByParentId 用 FullAudited 的 CreatorId 顶替。
/// </summary>
public class ChildProfile : FullAuditedAggregateRoot<Guid>
{
    public Guid ParentId { get; private set; }
    public string DisplayName { get; private set; }
    public int Grade { get; private set; }
    public string? AvatarKey { get; private set; }
    public string? Pin { get; private set; }        // 可选 4 位 PIN；登录逻辑在后续阶段

    protected ChildProfile()
    {
    }

    public ChildProfile(Guid id, Guid parentId, [NotNull] string displayName, int grade)
        : base(id)
    {
        ParentId = parentId;
        SetDisplayName(displayName);
        SetGrade(grade);
    }

    public ChildProfile SetDisplayName([NotNull] string displayName)
    {
        DisplayName = Check.NotNullOrWhiteSpace(displayName, nameof(displayName), maxLength: 32);
        return this;
    }

    public ChildProfile SetGrade(int grade)
    {
        if (grade < GradeConsts.Min || grade > GradeConsts.Max)
        {
            throw new ArgumentException($"grade must be within [{GradeConsts.Min},{GradeConsts.Max}]", nameof(grade));
        }

        Grade = grade;
        return this;
    }

    public void SetAvatar(string? avatarKey) => AvatarKey = avatarKey;

    public void SetPin(string? pin) => Pin = pin;

    /// <summary>校验 4 位 PIN；未设 PIN 的孩子任何输入都不通过（门只对设了 PIN 的孩子生效）。</summary>
    public bool VerifyPin(string? pin) => !string.IsNullOrEmpty(Pin) && Pin == pin;
}
