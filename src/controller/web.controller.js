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
        await page.goto(url, { waitUntil: 'networkidle2' });

        const timestamp = Date.now();
        const screenshotPath = path.resolve('public/temp', `screenshot_${timestamp}.png`);
        const resizedScreenshotPath = path.resolve('public/temp', `screenshot_resized_${timestamp}.png`);

        await page.screenshot({ path: screenshotPath });
        const content = await page.content();
        await browser.close();

        const $ = cheerio.load(content);
        const name = $('meta[property="og:site_name"]').attr('content') || $('title').text() || $('h1').first().text();
        const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || $('p').first().text();
        let companyLogo = $('meta[property="og:image"]').attr('content');

        if (!companyLogo) {
            companyLogo = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
            if (companyLogo && !companyLogo.startsWith('http')) {
                const urlObj = new URL(url);
                companyLogo = `${urlObj.origin}${companyLogo}`;
            }
        }

        const socialMedia = {
            facebookURL: $('a[href*="facebook.com"]').attr('href'),
            linkedinURL: $('a[href*="linkedin.com"]').attr('href'),
            twitterURL: $('a[href*="twitter.com"]').attr('href'),
            instagramURL: $('a[href*="instagram.com"]').attr('href')
        };
        const address = $('[itemprop="address"]').text();
        const phoneNumber = $('[itemprop="telephone"]').text() || $('a[href^="tel:"]').text();
        const email = $('a[href^="mailto:"]').attr('href') ? $('a[href^="mailto:"]').attr('href').replace('mailto:', '') : null;

        await sharp(screenshotPath)
            .resize(800)
            .toFile(resizedScreenshotPath);

        const uploadResult = await uploadOnCloudinary(resizedScreenshotPath);

        const result = {
            name,
            description,
            companyLogo,
            ...socialMedia,
            address,
            phoneNumber,
            email,
            screenshot: uploadResult.url
        };

        return result;
    } catch (error) {
        console.error("Error scraping website:", error);
        throw new ApiError(500, "Error scraping website");
    }
}

const generateAndSave = asyncHandler(async (req, res) => {
    const { url } = req.body;

    if (!url) {
        throw new ApiError(400, "A URL is required");
    }

    try {
        const data = await scrapeWebsite(url);
        
        if (!data) {
            throw new ApiError(400, "Error scraping data");
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
        });

        const createdWeb = await Web.findById(web._id);

        if (!createdWeb) {
            throw new ApiError(500, "Something went wrong during the scraping");
        }

        return res.status(201).json(new ApiResponse(200, createdWeb, "Data scraped successfully. Please refresh."));
    } catch (error) {
        console.error("Error in generateAndSave:", error);
        throw new ApiError(500, "Internal server error occurred");
    }
});


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