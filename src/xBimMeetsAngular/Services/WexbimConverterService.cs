using System.IO;
using System.Text;
using System.Threading.Tasks;
using Xbim.Ifc;
using Xbim.ModelGeometry.Scene;

namespace xBimMeetsAngular.Services
{
    public class WexbimConverterService
    {
        public async Task<Stream> ConvertAsync(Stream ifcStream)
        {
            var ifcStoreGenerator = new IfcStoreGenerator(ifcStream);
            using (var ifcStore = await ifcStoreGenerator.GetIfcStoreAsync())
            {
                var wexBimStream = await ConvertIfcToWexBimAsync(ifcStore);
                return wexBimStream;
            }
        }

        public static Task<Stream> ConvertIfcToWexBimAsync(IfcStore ifcStore)
        {
            return Task.Run<Stream>(() =>
            {
                var context = new Xbim3DModelContext(ifcStore);
                context.CreateContext();
                var memStream = new MemoryStream();
                using (var wexBimBinaryWriter = new BinaryWriter(memStream, Encoding.Default, true))
                {
                    ifcStore.SaveAsWexBim(wexBimBinaryWriter);
                }
                memStream.Position = 0;
                return memStream;
            });
        }
    }
}
