import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Web } from "../modules/web.model.js";
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function scrapeWebsite(url) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);

        // Generate unique names for screenshots using a timestamp
        const timestamp = Date.now();
        const screenshotPath = path.resolve('public/temp', `screenshot_${timestamp}.png`);
        const resizedScreenshotPath = path.resolve('public/temp', `screenshot_resized_${timestamp}.png`);

        // Take a screenshot
        await page.screenshot({ path: screenshotPath});

        // Get the page content
        const content = await page.content();
        await browser.close();

        // Load content into cheerio
        const $ = cheerio.load(content);

        // Extract information
        const name = $('meta[property="og:site_name"]').attr('content') || $('title').text() || $('h1').first().text();;
        const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || $('p').first().text();
        let companyLogo = $('meta[property="og:image"]').attr('content');

        // Check for favicon if company logo is not found
        if (!companyLogo) {
            companyLogo = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
            if (companyLogo && !companyLogo.startsWith('http')) {
                const urlObj = new URL(url);
                companyLogo = `${urlObj.origin}${companyLogo}`;
            }
        }
        const facebookURL = $('a[href*="facebook.com"]').attr('href');
        const linkedinURL = $('a[href*="linkedin.com"]').attr('href');
        const twitterURL = $('a[href*="twitter.com"]').attr('href');
        const instagramURL = $('a[href*="instagram.com"]').attr('href');
        const address = $('[itemprop="address"]').text();
        const phoneNumber = $('[itemprop="telephone"]').text() || $('a[href^="tel:"]').text();
        const email = $('a[href^="mailto:"]').attr('href') ? $('a[href^="mailto:"]').attr('href').replace('mailto:', '') : null;

        // Resize the screenshot
        await sharp(screenshotPath)
            .resize(800)
            .toFile(resizedScreenshotPath);

        // Upload the screenshot to Cloudinary
        const uploadResult = await uploadOnCloudinary(resizedScreenshotPath)

        // Output the results
        const result = {
            name,
            description,
            companyLogo,
            facebookURL,
            linkedinURL,
            twitterURL,
            instagramURL,
            address,
            phoneNumber,
            email,
            screenshot: uploadResult.url
        };

        console.log(result);
        return result;
    } catch (error) {
        console.log("Error scrapping error", error)

    }
}
const generateAndSave = asyncHandler(async (req, res) => {
    const { url } = req.body
    if (!url) {
        throw new ApiError(400, "An Url is required")
    }
    const data = await scrapeWebsite(url)
    if (!data) {
        console.log("Error scrapping data")
        throw new ApiError(400, "Error scrapping data")
    }
    const web = await Web.create({
        name: data.name,
        description: data.description,
        logo: data?.companyLogo || "",
        facebook: data?.facebookURL || "",
        linkedin: data?.linkedinURL || "",
        twitter: data?.twitterURL || "",
        instagram: data?.instagramURL || "",
        address: data?.address || "",
        phone: data?.phoneNumber || "",
        email: data?.email || "",
        screenshot: data?.screenshot || ""
    })
    const createdWeb = await Web.findById(web._id)
    if (!createdWeb) {
        throw new ApiError(500, "Something went wrong during the scrapping")
    }
    return res.status(201).json(
        new ApiResponse(200, createdWeb, "Data Scrapped Please Refresh")
    )
})

const generateAll= asyncHandler(async(req,res)=>{
    const allData = await Web.find({}).sort({ createdAt: -1 }); 
    if(!allData){
        throw new ApiError(400,"Error generating data")
    }
    return res.status(201).json(
        new ApiResponse(200, allData, "All the data is featched succesfully")
    )
})

const deleteGenerates = asyncHandler(async (req, res) => {
    const ids = req.body.ids;
    try {
        
        const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

       
        const result = await Web.deleteMany({
            _id: { $in: objectIds }
        });

        
        res.status(200).json(new ApiResponse(200, `${result.deletedCount} objects deleted .Please refresh`));
    } catch (error) {
        console.error('Error deleting objects:', error);
        throw new ApiError(500, 'Error deleting objects');
    }
});

export { generateAndSave,generateAll,deleteGenerates }