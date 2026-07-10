using System;
using System.Collections.Generic;
using System.Linq;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Catalog;

/// <summary>全局宠物图鉴项：名称 + 封面 + 5 形态（含 4 段进化）。</summary>
public class PetSpecies : FullAuditedAggregateRoot<Guid>
{
    public const int FormCount = 5;

    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string? CoverObjectKey { get; private set; }
    public string? AccentColor { get; private set; }
    public string? Description { get; private set; }
    public bool IsActive { get; private set; }
    public int DisplayOrder { get; private set; }

    private readonly List<PetForm> _forms = new();
    public IReadOnlyCollection<PetForm> Forms => _forms.AsReadOnly();

    protected PetSpecies() { }

    public PetSpecies(Guid id, [NotNull] string name, [NotNull] string code) : base(id)
    {
        SetName(name);
        SetCode(code);
        IsActive = false;
    }

    public PetSpecies SetName([NotNull] string name)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        return this;
    }

    public PetSpecies SetCode([NotNull] string code)
    {
        Code = Check.NotNullOrWhiteSpace(code, nameof(code), maxLength: 64);
        return this;
    }

    public void SetAccentColor(string? accentColor) => AccentColor = accentColor;

    public void SetDescription(string? description) => Description = description;

    public void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;

    public void SetCover(string? coverObjectKey) => CoverObjectKey = coverObjectKey;

    public PetForm SetForm(int level, string name, string? revealText, int? growthToNext, decimal? scale)
    {
        if (level < 1 || level > FormCount)
        {
            throw new ArgumentException($"level must be within [1,{FormCount}]", nameof(level));
        }

        var form = _forms.FirstOrDefault(f => f.Level == level);
        if (form == null)
        {
            form = new PetForm(Id, level);
            _forms.Add(form);
        }

        form.Set(name, revealText, growthToNext, scale);
        return form;
    }

    public void SetFormSprite(int level, string? spriteObjectKey)
        => GetForm(level).SetSprite(spriteObjectKey);

    public void SetFormEvolveVideo(int level, string? evolveVideoObjectKey)
        => GetForm(level).SetEvolveVideo(evolveVideoObjectKey);

    public void Activate()
    {
        if (_forms.Count != FormCount)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                .WithData("reason", $"needs {FormCount} forms");
        }

        if (string.IsNullOrEmpty(CoverObjectKey))
        {
            throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                .WithData("reason", "cover missing");
        }

        foreach (var form in _forms)
        {
            if (string.IsNullOrEmpty(form.SpriteObjectKey))
            {
                throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                    .WithData("reason", $"form {form.Level} sprite missing");
            }

            if (form.Level < FormCount)
            {
                if (form.GrowthToNext is null or <= 0)
                {
                    throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                        .WithData("reason", $"form {form.Level} growthToNext invalid");
                }

                if (string.IsNullOrEmpty(form.EvolveVideoObjectKey))
                {
                    throw new BusinessException(HomeworkDomainErrorCodes.PetSpeciesIncomplete)
                        .WithData("reason", $"form {form.Level} evolve video missing");
                }
            }
        }

        IsActive = true;
    }

    public void Deactivate() => IsActive = false;

    private PetForm GetForm(int level)
    {
        var form = _forms.FirstOrDefault(f => f.Level == level);
        if (form == null)
        {
            throw new ArgumentException($"form level {level} not defined yet", nameof(level));
        }

        return form;
    }
}
