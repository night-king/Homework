using Microsoft.Extensions.Configuration;
using Volo.Abp.DependencyInjection;

namespace Homework.Catalog;

public class AssetUrlResolver : IAssetUrlResolver, ITransientDependency
{
    private readonly string _baseUrl;

    public AssetUrlResolver(IConfiguration configuration)
    {
        _baseUrl = (configuration["App:AssetCdnBaseUrl"] ?? string.Empty).TrimEnd('/');
    }

    public string? ToUrl(string? objectKey)
    {
        return string.IsNullOrEmpty(objectKey)
            ? null
            : $"{_baseUrl}/{objectKey.TrimStart('/')}";
    }
}
