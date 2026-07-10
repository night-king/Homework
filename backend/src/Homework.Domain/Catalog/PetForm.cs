using System;
using Volo.Abp;
using Volo.Abp.Domain.Entities;

namespace Homework.Catalog;

/// <summary>宠物的一个形态阶（每个 PetSpecies 恰好 5 个，复合键 PetSpeciesId + Level）。</summary>
public class PetForm : Entity
{
    public Guid PetSpeciesId { get; private set; }
    public int Level { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? SpriteObjectKey { get; private set; }
    public string? RevealText { get; private set; }
    public int? GrowthToNext { get; private set; }
    public string? EvolveVideoObjectKey { get; private set; }
    public decimal? Scale { get; private set; }

    protected PetForm() { }

    public PetForm(Guid petSpeciesId, int level)
    {
        PetSpeciesId = petSpeciesId;
        Level = level;
    }

    public void Set(string name, string? revealText, int? growthToNext, decimal? scale)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        RevealText = revealText;
        GrowthToNext = growthToNext;
        Scale = scale;
    }

    public void SetSprite(string? spriteObjectKey) => SpriteObjectKey = spriteObjectKey;

    public void SetEvolveVideo(string? evolveVideoObjectKey) => EvolveVideoObjectKey = evolveVideoObjectKey;

    public override object[] GetKeys() => new object[] { PetSpeciesId, Level };
}
