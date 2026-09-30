import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import 'dotenv/config';

const app=express();
app.use(cors({origin:true}));
app.use(express.json());
const pool=mysql.createPool(process.env.MYSQL_PRIVATE_URL||process.env.DATABASE_URL);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}});
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET) console.warn('JWT_SECRET is not set');
function auth(req,res,next){try{const h=req.headers.authorization||'';req.user=jwt.verify(h.replace(/^Bearer /,''),JWT_SECRET);next()}catch{res.status(401).json({error:'Unauthorized'})}}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'isoko-admin-api'}));

app.post('/api/auth/setup',async(req,res)=>{try{
 const {email,password}=req.body;
 if(!email||!password||password.length<8)return res.status(400).json({error:'Email and password (8+ chars) required'});
 const [rows]=await pool.query('SELECT COUNT(*) c FROM admins');
 if(rows[0].c>0)return res.status(409).json({error:'Owner account already exists'});
 const hash=await bcrypt.hash(password,12);
 await pool.query('INSERT INTO admins(email,password_hash) VALUES(?,?)',[email.toLowerCase(),hash]);
 res.json({ok:true});
}catch(e){res.status(500).json({error:e.message})}});

app.post('/api/auth/login',async(req,res)=>{try{
 const [rows]=await pool.query('SELECT id,email,password_hash FROM admins WHERE email=?',[String(req.body.email||'').toLowerCase()]);
 if(!rows[0]||!(await bcrypt.compare(req.body.password||'',rows[0].password_hash)))return res.status(401).json({error:'Invalid login'});
 res.json({token:jwt.sign({id:rows[0].id,email:rows[0].email},JWT_SECRET,{expiresIn:'12h'})});
}catch(e){res.status(500).json({error:e.message})}});

app.get('/api/settings',async(req,res)=>{const [rows]=await pool.query('SELECT * FROM site_settings WHERE id=1');res.json(rows[0]||{})});
app.put('/api/settings',auth,async(req,res)=>{const {phone,hours,address,instagram}=req.body;await pool.query('UPDATE site_settings SET phone=?,hours=?,address=?,instagram=? WHERE id=1',[phone,hours,address,instagram]);res.json({ok:true})});

app.get('/api/menu',async(req,res)=>{const [rows]=await pool.query('SELECT id,category,name,price_rwf,sort_order FROM menu_items ORDER BY category,sort_order,name');res.json(rows)});
app.post('/api/menu',auth,async(req,res)=>{const {category,name,price_rwf,sort_order=0}=req.body;const [r]=await pool.query('INSERT INTO menu_items(category,name,price_rwf,sort_order) VALUES(?,?,?,?)',[category,name,Number(price_rwf),Number(sort_order)]);res.json({id:r.insertId})});
app.put('/api/menu/:id',auth,async(req,res)=>{const {category,name,price_rwf,sort_order=0}=req.body;await pool.query('UPDATE menu_items SET category=?,name=?,price_rwf=?,sort_order=? WHERE id=?',[category,name,Number(price_rwf),Number(sort_order),req.params.id]);res.json({ok:true})});
app.delete('/api/menu/:id',auth,async(req,res)=>{await pool.query('DELETE FROM menu_items WHERE id=?',[req.params.id]);res.json({ok:true})});

app.get('/api/gallery',async(req,res)=>{const [rows]=await pool.query('SELECT id,filename,caption,mime_type,created_at FROM gallery ORDER BY created_at DESC');res.json(rows)});
app.get('/api/gallery/:id/image',async(req,res)=>{const [rows]=await pool.query('SELECT mime_type,image_data FROM gallery WHERE id=?',[req.params.id]);if(!rows[0])return res.sendStatus(404);res.set('Content-Type',rows[0].mime_type);res.send(rows[0].image_data)});
app.post('/api/gallery',auth,upload.single('photo'),async(req,res)=>{if(!req.file)return res.status(400).json({error:'Photo required'});const [r]=await pool.query('INSERT INTO gallery(filename,caption,mime_type,image_data) VALUES(?,?,?,?)',[req.file.originalname,req.body.caption||'',req.file.mimetype,req.file.buffer]);res.json({id:r.insertId})});
app.delete('/api/gallery/:id',auth,async(req,res)=>{await pool.query('DELETE FROM gallery WHERE id=?',[req.params.id]);res.json({ok:true})});

async function initDb(){
 await pool.query(`CREATE TABLE IF NOT EXISTS admins (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(255) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS site_settings (id INT PRIMARY KEY,phone VARCHAR(50),hours VARCHAR(100),address VARCHAR(255),instagram VARCHAR(500),updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS menu_items (id INT AUTO_INCREMENT PRIMARY KEY,category VARCHAR(100) NOT NULL,name VARCHAR(255) NOT NULL,price_rwf INT NOT NULL DEFAULT 0,sort_order INT NOT NULL DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS gallery (id INT AUTO_INCREMENT PRIMARY KEY,filename VARCHAR(255) NOT NULL,caption VARCHAR(255),mime_type VARCHAR(100) NOT NULL,image_data MEDIUMBLOB NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
 const menuSeed=[
 ['Breakfast','Sausage Omelette',5000],['Breakfast','Spanish Omelette',3000],['Breakfast','Special Omelette',5000],['Breakfast','Rolex Plain',3500],['Breakfast','Rolex Chips',6000],['Breakfast','Beef Boilo',5000],['Breakfast','Chicken Boilo',5000],
 ['Salads','Fruit Salad',5000],['Salads','Volcano Garden Salad',5000],['Salads','Isoko Fruits Plata',6000],['Salads','Gucambale',4000],
 ['Lunch & Dinner','Chips Plata',3000],['Lunch & Dinner','Chicken Wings',6000],['Lunch & Dinner','Chicken or Beef Wrap',6000],['Lunch & Dinner','Chicken or Beef Sandwich',7000],['Lunch & Dinner','Chicken or Beef Stew',7000],['Lunch & Dinner','Chicken or Beef Stroganoff',7000],['Lunch & Dinner','Chicken or Beef Pillau',6000],['Lunch & Dinner','Isoko Spaghetti',6000],
 ['Meat','Fried 1/4 Chicken',7000],['Meat','Fried 1/2 Chicken',11000],['Meat','Whole Chicken',20000],['Meat','Family Chicken Rice',25000],['Meat','Roasted Tilapia',15000],['Meat','Chicken Brochette',7000],
 ['Hot Dishes','Fried Chicken Leg',5500],['Hot Dishes','Half Chicken',10000],['Hot Dishes','Whole Chicken',20000],['Hot Dishes','Family Chicken Rice',25000],['Hot Dishes','Roasted Tilapia',15000],['Hot Dishes','Beef Stew',5000],
 ['Fast Food','Beef Burger',5000],['Fast Food','Chicken Burger',6000],['Fast Food','Ham, Cheese Burger',4000],['Fast Food','Chicken Avo Sandwich',5000],['Fast Food','Club Sandwich',4000],['Fast Food','Veggie Wrap',4000],['Fast Food','Beef or Chicken Wrap',4500],
 ['Coffee','Espresso',1500],['Coffee','Macchiato',2000],['Coffee','Americano',2000],['Coffee','Black Coffee',2000],['Coffee','French Press',3000],['Coffee','Cappuccino',2000],['Coffee','Café Latte',2000],['Coffee','Cortado',2000],['Coffee','African Coffee',2500],['Coffee','Hot Chocolate',2000],
 ['Tea','African Tea',2000],['Tea','Black Tea',2000],['Tea','Green Tea',2000],['Tea','Umwoya Tea',2000],['Tea','Meant Tea',2000],['Tea','Lemon Tea',2000],['Tea','Spiced Tea',2500],
 ['Juices','Mango',3000],['Juices','Pineapple',3000],['Juices','Passion',3500],['Juices','Mango Banana',4000],['Juices','Mango Pineapple',4000],['Juices','Creamed Banana',3000],
 ['Milkshakes','Chocolate',4000],['Milkshakes','Vanilla',4000],['Milkshakes','Mango',4000],['Milkshakes','Caramel',4000],
 ['Iced','Iced Coffee',2500],['Iced','Iced Tea',2500],
 ['Quick Breakfast','Plain Omelet',1500],['Quick Breakfast','Spanish Omelet',2000],['Quick Breakfast','Special Omelet',4000],['Quick Breakfast','Rolex',2000],['Quick Breakfast','Local Agatogo',4000],['Quick Breakfast','Beef Boilo',4000],['Quick Breakfast','Chicken Boilo',5000]
 ];
 for(const [category,name,price_rwf] of menuSeed){
   await pool.query('INSERT INTO menu_items(category,name,price_rwf,sort_order) SELECT ?,?,?,COALESCE(MAX(sort_order)+1,0) FROM menu_items WHERE category=? AND name=? HAVING COUNT(*)=0',[category,name,price_rwf,category,name]);
 }
 await pool.query(`INSERT IGNORE INTO site_settings(id,phone,hours,address,instagram) VALUES(1,'+250 780 711 135','05:30–00:00 daily','Camp Muhoza, NM 63 St, Musanze','https://www.instagram.com/isokocoffeehouse/')`);
}
const port=process.env.PORT||3000;
initDb().then(()=>app.listen(port,()=>console.log('Isoko API listening on '+port))).catch(e=>{console.error(e);process.exit(1)});