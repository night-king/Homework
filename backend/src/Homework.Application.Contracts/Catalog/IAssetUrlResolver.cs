namespace Homework.Catalog;

/// <summary>把存储的 OSS object key 解析为对外可访问的 CDN URL。</summary>
public interface IAssetUrlResolver
{
    string? ToUrl(string? objectKey);
}
