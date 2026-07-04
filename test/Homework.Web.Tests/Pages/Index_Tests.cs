using System.Threading.Tasks;
using Shouldly;
using Xunit;

namespace Homework.Pages;

public class Index_Tests : HomeworkWebTestBase
{
    [Fact]
    public async Task Welcome_Page()
    {
        var response = await GetResponseAsStringAsync("/");
        response.ShouldNotBeNull();
    }
}
