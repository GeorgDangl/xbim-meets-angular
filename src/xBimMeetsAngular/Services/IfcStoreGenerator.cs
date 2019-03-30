using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xbim.Ifc;
using Xbim.IO;

namespace xBimMeetsAngular.Services
{
    public class IfcStoreGenerator
    {
        private readonly Stream _ifcStream;

        public IfcStoreGenerator(Stream ifcStream)
        {
            _ifcStream = ifcStream;
        }

        public async Task<IfcStore> GetIfcStoreAsync()
        {
            var isIfcZip = await CheckIfFileIsIfcZipAsync();
            return await GetIfcStoreForIfcFileAsync(isIfcZip);
        }

        private async Task<bool> CheckIfFileIsIfcZipAsync()
        {
            const int ZIP_LEAD_BYTES = 0x04034b50;
            var readBytes = new byte[4];
            await _ifcStream.ReadAsync(readBytes, 0, 4);
            _ifcStream.Position = 0;
            var isIfcZip = BitConverter.ToInt32(readBytes, 0) == ZIP_LEAD_BYTES;
            return isIfcZip;
        }

        private async Task<IfcStore> GetIfcStoreForIfcFileAsync(bool isIfcZip)
        {
            var storageType = isIfcZip ? Xbim.IO.StorageType.IfcZip : Xbim.IO.StorageType.Ifc;
            var ifcSchemaVersion = await GetSchemaVersionAsync(isIfcZip);
            var store = IfcStore.Open(_ifcStream, storageType, ifcSchemaVersion, XbimModelType.MemoryModel);
            return store;
        }

        private async Task<Xbim.Common.Step21.XbimSchemaVersion> GetSchemaVersionAsync(bool isIfcZip)
        {
            Xbim.Common.Step21.XbimSchemaVersion schemaVersion;
            if (isIfcZip)
            {
                schemaVersion = await GetSchemaVersionForIfcZipAsync();
            }
            else
            {
                schemaVersion = await GetSchemaVersionFromIfcFileStreamAsync(_ifcStream);
            }

            _ifcStream.Position = 0;
            return schemaVersion;
        }

        private async Task<Xbim.Common.Step21.XbimSchemaVersion> GetSchemaVersionForIfcZipAsync()
        {
            using (var zipArchive = new System.IO.Compression.ZipArchive(_ifcStream, System.IO.Compression.ZipArchiveMode.Read, true))
            {
                using (var ifcEntryStream = zipArchive.Entries.First().Open())
                {
                    return await GetSchemaVersionFromIfcFileStreamAsync(ifcEntryStream);
                }
            }
        }

        private async Task<Xbim.Common.Step21.XbimSchemaVersion> GetSchemaVersionFromIfcFileStreamAsync(Stream ifcFileStream)
        {
            using (var streamReader = new StreamReader(ifcFileStream, Encoding.UTF8, true, 1024, true))
            {
                // Only checking up to line number 1000 if it contains a schema identifier
                for (var i = 0; i < 1_000; i++)
                {
                    var currentLine = await streamReader.ReadLineAsync();
                    if (CultureInfo.InvariantCulture.CompareInfo.IndexOf(currentLine, "'IFC4'") >= 0)
                    {
                        return Xbim.Common.Step21.XbimSchemaVersion.Ifc4;
                    }
                    else if (CultureInfo.InvariantCulture.CompareInfo.IndexOf(currentLine, "'IFC4X1'") >= 0)
                    {
                        return Xbim.Common.Step21.XbimSchemaVersion.Ifc4x1;
                    }
                    else if (CultureInfo.InvariantCulture.CompareInfo.IndexOf(currentLine, "'IFC2X3'") >= 0)
                    {
                        return Xbim.Common.Step21.XbimSchemaVersion.Ifc2X3;
                    }
                    else if (CultureInfo.InvariantCulture.CompareInfo.IndexOf(currentLine, "'IFC2X'") >= 0)
                    {
                        return Xbim.Common.Step21.XbimSchemaVersion.Ifc2X3;
                    }
                }
            }

            return Xbim.Common.Step21.XbimSchemaVersion.Unsupported;
        }
    }
}
