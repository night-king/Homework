using System;
using System.Linq;
using Homework.Catalog;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Homework.Catalog;

public class PetSpecies_Tests
{
    private static PetSpecies FullyConfigured()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.SetCover("pets/x/cover.png");
        // 1-4 阶：名字 + 阈值 + 精灵图 + 进化视频
        for (var lvl = 1; lvl <= 4; lvl++)
        {
            s.SetForm(lvl, $"阶{lvl}", revealText: null, growthToNext: lvl * 20, scale: 1m);
            s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
            s.SetFormEvolveVideo(lvl, $"pets/x/evolve-{lvl}-{lvl + 1}.mp4");
        }
        // 5 阶：名字 + 精灵图，无阈值/视频
        s.SetForm(5, "满阶", revealText: "首次喷火", growthToNext: null, scale: 1.6m);
        s.SetFormSprite(5, "pets/x/form-5.png");
        return s;
    }

    [Fact]
    public void Creates_Inactive_With_Name_And_Code()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.Name.ShouldBe("火龙");
        s.Code.ShouldBe("dragon");
        s.IsActive.ShouldBeFalse();
        s.Forms.Count.ShouldBe(0);
    }

    [Fact]
    public void SetForm_Is_Idempotent_Per_Level()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.SetForm(1, "蛋", null, 20, 0.5m);
        s.SetForm(1, "龙蛋", null, 30, 0.6m);
        s.Forms.Count.ShouldBe(1);
        s.Forms.Single().Name.ShouldBe("龙蛋");
        s.Forms.Single().GrowthToNext.ShouldBe(30);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void SetForm_Rejects_Level_Out_Of_Range(int level)
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        Should.Throw<ArgumentException>(() => s.SetForm(level, "x", null, 10, 1m));
    }

    [Fact]
    public void Activate_Succeeds_When_Fully_Configured()
    {
        var s = FullyConfigured();
        s.Activate();
        s.IsActive.ShouldBeTrue();
    }

    [Fact]
    public void Activate_Fails_When_Missing_A_Form()
    {
        var s = FullyConfigured();
        // 破坏：把第 3 阶精灵图清空
        s.SetFormSprite(3, null!);
        Should.Throw<BusinessException>(() => s.Activate());
    }

    [Fact]
    public void Activate_Fails_When_Only_Four_Forms()
    {
        var s = new PetSpecies(Guid.NewGuid(), "火龙", "dragon");
        s.SetCover("pets/x/cover.png");
        for (var lvl = 1; lvl <= 4; lvl++)
        {
            s.SetForm(lvl, $"阶{lvl}", null, lvl * 20, 1m);
            s.SetFormSprite(lvl, $"pets/x/form-{lvl}.png");
            s.SetFormEvolveVideo(lvl, $"pets/x/e-{lvl}.mp4");
        }
        Should.Throw<BusinessException>(() => s.Activate());
    }
}
