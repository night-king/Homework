using System.IO;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Shouldly;
using Volo.Abp.BlobStoring;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class CatalogBlob_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public CatalogBlob_Tests()
    {
        _blob = GetRequiredService<IBlobContainer<CatalogBlobContainer>>();
    }

    [Fact]
    public async Task Saves_And_Reads_Back()
    {
        var bytes = Encoding.UTF8.GetBytes("hello-oss");
        await _blob.SaveAsync("pets/test/cover.png", new MemoryStream(bytes), overrideExisting: true);

        await using var read = await _blob.GetAsync("pets/test/cover.png");
        using var ms = new MemoryStream();
        await read.CopyToAsync(ms);
        Encoding.UTF8.GetString(ms.ToArray()).ShouldBe("hello-oss");
    }
}
