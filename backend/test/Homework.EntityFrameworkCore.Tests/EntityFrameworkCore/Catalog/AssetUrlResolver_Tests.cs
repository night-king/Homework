using System.Collections.Generic;
using Homework.Catalog;
using Microsoft.Extensions.Configuration;
using Shouldly;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

public class AssetUrlResolver_Tests
{
    private static IAssetUrlResolver Build(string? baseUrl)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["App:AssetCdnBaseUrl"] = baseUrl })
            .Build();
        return new AssetUrlResolver(config);
    }

    [Fact]
    public void Joins_Base_And_Key()
    {
        Build("https://cdn.example.com/host/catalog")
            .ToUrl("rewards/abc.png")
            .ShouldBe("https://cdn.example.com/host/catalog/rewards/abc.png");
    }

    [Fact]
    public void Trims_Duplicate_Slashes()
    {
        Build("https://cdn.example.com/host/catalog/")
            .ToUrl("/rewards/abc.png")
            .ShouldBe("https://cdn.example.com/host/catalog/rewards/abc.png");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Null_Or_Empty_Key_Returns_Null(string? key)
    {
        Build("https://cdn.example.com").ToUrl(key).ShouldBeNull();
    }
}
