using Microsoft.AspNetCore.Builder;
using Homework;
using Volo.Abp.AspNetCore.TestBase;

var builder = WebApplication.CreateBuilder();

builder.Environment.ContentRootPath = GetWebProjectContentRootPathHelper.Get("Homework.Web.csproj");
await builder.RunAbpModuleAsync<HomeworkWebTestModule>(applicationName: "Homework.Web" );

public partial class Program
{
}
