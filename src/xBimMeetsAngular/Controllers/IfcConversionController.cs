using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using xBimMeetsAngular.Services;

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

            try
            {
                using (var ifcStream = ifcFile.OpenReadStream())
                {
                    if (ifcStream.Length > 5_000_000)
                    {
                        return BadRequest("This demo only supports IFC models up to 5 MB");
                    }

                    var wexbimConverter = new WexbimConverterService();
                    var wexBimStream = await wexbimConverter.ConvertAsync(ifcStream);
                    return File(wexBimStream, "application/octet-stream", "model.wexbim");
                }
            }
            catch
            {
                // The conversion failed
                return BadRequest();
            }
        }
    }
}
