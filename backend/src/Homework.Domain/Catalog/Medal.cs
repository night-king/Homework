using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Catalog;

/// <summary>全局勋章图鉴项；旅程完成时授予其一。</summary>
public class Medal : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? ImageObjectKey { get; private set; }
    public bool IsActive { get; private set; }
    public int DisplayOrder { get; private set; }

    protected Medal() { }

    public Medal(Guid id, [NotNull] string name) : base(id)
    {
        SetName(name);
        IsActive = false;
    }

    public Medal SetName([NotNull] string name)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        return this;
    }

    public void SetDescription(string? description) => Description = description;

    public void SetImage(string? imageObjectKey) => ImageObjectKey = imageObjectKey;

    public void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
