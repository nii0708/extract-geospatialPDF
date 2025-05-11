const fs = require("fs");
const { PDFDocument, PDFName } = require("pdf-lib");

async function main() {
  // Load the PDF from file
  const pdfBytes = fs.readFileSync("sample_usgs2.pdf");
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Access low-level PDF structure
  const context = pdfDoc.context;

  // console.log("pdfDoc.catalog : ", pdfDoc.catalog.get(PDFName.of("Pages")));
  const catalog = pdfDoc.catalog;

  // Get the Pages dictionary (Page Tree root)
  const pagesRef = catalog.get(PDFName.of("Pages"));
  const pagesDict = pdfDoc.context.lookup(pagesRef);
  const kidsArray = pagesDict.get(PDFName.of("Kids"));
  const MediaBox = kidsArray.get(PDFName.of("MediaBox"));

  const firstKidRef = kidsArray.get(0); // PDFRef
  const firstKid = pdfDoc.context.lookup(firstKidRef); // Now you have the PDFDict or PDFPageLeaf

  const mediaBox = firstKid.get(PDFName.of("MediaBox")).array.map((element) => {
    return element.numberValue;
  });
  const VP_array = firstKid.get(PDFName.of("VP")).array;
  const VP_array_length = VP_array.length;

  let bboxList = 0;
  let gptsList = 0;
  let areaBBOXMax = 0;

  for (let i = 0; i < VP_array_length; i++) {
    const item = VP_array[i]; // Add this line
    const BBOX = item.get(PDFName.of("BBox"));
    const BBOXs = BBOX.array.map((element) => {
      return element.numberValue;
    });

    const areaBBOX =
      Math.abs(BBOXs[2] - BBOXs[0]) * Math.abs(BBOXs[1] - BBOXs[3]);

    if (areaBBOX > areaBBOXMax) {
      const Measure = item.get(PDFName.of("Measure"));
      const MeasureDict = pdfDoc.context.lookup(Measure);
      const GPTS = MeasureDict.get(PDFName.of("GPTS"));
      console.log("MAX areaBBOX:", areaBBOX);
      areaBBOXMax = areaBBOX;
      const GPT = GPTS.array.map((element) => {
        return element.numberValue;
      });
      const lat = GPT.filter((element, index) => index % 2 === 0);
      const lon = GPT.filter((element, index) => index % 2 === 1);
      const xs = BBOXs.filter((element, index) => index % 2 === 0);
      const ys = BBOXs.filter((element, index) => index % 2 === 1);
      const maxLon = Math.max(...lon);
      const minLon = Math.min(...lon);
      const maxLat = Math.max(...lat);
      const minLat = Math.min(...lat);
      const maxXs = Math.max(...xs);
      const minXs = Math.min(...xs);
      const maxYs = Math.max(...ys);
      const minYs = Math.min(...ys);
      bboxList = [minXs, minYs, maxXs, maxYs];
      gptsList = [minLon, minLat, maxLon, maxLat];
    }
  }

  const dLon = gptsList[2] - gptsList[0];
  const dLat = gptsList[3] - gptsList[1];
  const dX = Math.abs(bboxList[2] - bboxList[0]);
  const dY = Math.abs(bboxList[3] - bboxList[1]);
  const gradY = dLat / dY;
  const gradX = dLon / dX;
  const left = gptsList[0] - gradX * bboxList[0];
  const right = gptsList[2] + gradX * (mediaBox[2] - bboxList[2]);
  console.log("mediaBox[1] - bboxList[1] :", bboxList[1]);
  const upper = gptsList[3] + gradY * Math.abs(mediaBox[3] - bboxList[3]);
  const bottom = gptsList[1] - gradY * bboxList[1];

  console.log("mediaBox:", mediaBox);
  console.log("BBOX:", bboxList);
  console.log("GPTS:", gptsList);
  console.log("left: ", left);
  console.log("right: ", right);
  console.log("upper: ", upper);
  console.log("bottom: ", bottom);

  const coordinate_length = context.trailer;
}

main().catch((err) => console.error(err));
