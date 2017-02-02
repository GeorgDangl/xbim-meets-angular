using System.IO;
using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xbim.Ifc;
using Xbim.ModelGeometry.Scene;

namespace XBimViewerTest.Controllers
{
    [Route("Api/[controller]")]
    public class IfcConversionController : Controller
    {
        [HttpPost("IfcToWexbim")]
        public async Task<IActionResult> ConvertFromIfcGeometry(IFormFile ifcFile)
        {
            if (ifcFile == null)
            {
                return BadRequest();
            }
            Stream wexBimStream;
            try
            {
                wexBimStream = await ConvertIfcFileToWexbim(ifcFile.OpenReadStream(), Xbim.Common.Step21.IfcSchemaVersion.Ifc2X3);
            }
            catch // Unfortunately, on a schema mismatch, a regular System.Exception is thrown
            {
                try
                {
                    wexBimStream = await ConvertIfcFileToWexbim(ifcFile.OpenReadStream(), Xbim.Common.Step21.IfcSchemaVersion.Ifc4);
                }
                catch
                {
                    return BadRequest();
                }
            }
            if (wexBimStream != null)
            {
                return File(wexBimStream, "application/octet-stream", "model.wexbim");
            }
            return BadRequest();
        }

        private static Task<Stream> ConvertIfcFileToWexbim(Stream ifcFileStream, Xbim.Common.Step21.IfcSchemaVersion ifcSchemaVersion)
        {
            return Task.Run<Stream>(() =>
            {
                using (var model = IfcStore.Open(ifcFileStream, Xbim.IO.IfcStorageType.Ifc, ifcSchemaVersion, XbimModelType.MemoryModel))
                {
                    var context = new Xbim3DModelContext(model);
                    context.CreateContext();
                    var memStream = new MemoryStream();
                    using (var wexBimBinaryWriter = new BinaryWriter(memStream, Encoding.Default, true))
                    {
                        model.SaveAsWexBim(wexBimBinaryWriter);
                        wexBimBinaryWriter.Close();
                    }
                    memStream.Position = 0;
                    return memStream;
                }
            });
        }
    }
}