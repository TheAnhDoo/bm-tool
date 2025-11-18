1.1 Giai đoạn 1-chuẩn bị trước đã login cho các profile via
Bước 1: Vào trang chủ facebook.com, đợi 5s, refresh trang một lần, sau đó click vào 

``` CSS selector
#u_0_3_RL > img._s0._4ooo._1x2_._1ve7._1gax.img
```
Hoặc
``` Xpath
//*[@id="u_0_3_RL"]/img[1]
```
Bước 2: Lấy mật khẩu facebook của via được lưu và điền vào trong box input sau:
```CSS selector
#pass
```
```Xpath
//*[@id="u_0_q_CD"]/div[2]/div[1]/input[1]
```
Bước 3: bấm Enter
Bước 4: Đợi khoảng 5s
Bước 5: Sau đó, tại tab đang ngâm facebook, lấy link invite từ database và tiến hành giai đoạn 2 của via

1.2 Giai đoạn 1 - chuẩn bị trước login cho BM trung gian
Bước 1 Navigate đến base URL (facebook.com) trước
Bước 2 Đợi 2 giây (để page load)

Bước 3 Đợi thêm 3 giây (tổng 5 giây)
Bước 4 Set cookie
Bước 5 Reload page để đảm bảo cookie được apply
Bước 6 Sau đó mới navigate đến URL với business_id đã được lưu trong database(nếu có)
Bước 7 Navigate đến https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id=YOUR_BM_UID

2.1 Giai đoạn 2 - automation profile via:
Bước 1: paste link invite từ database, click vào 
```CSS selector
#login-panel-container > div.x1ey2m1c.x78zum5.xdt5ytf.xl56j7k.x1miatn0.x1gan7if.x13vifvy.x1x0by9y > div.x1n2onr6.x1ja2u2z.x9f619.x78zum5.xdt5ytf.x2lah0s.x193iq5w > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x1iyjqo2.x2lwn1j > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.x1l7klhg.x1iyjqo2.xs83m0k.x2lwn1j.x1xmf6yo.x1e56ztr.xzboxd6.x14l7nz5:nth-of-type(3) > div.x3nfvp2.x1n2onr6.xh8yej3 > div.x1i10hfl.xjbqb8w.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x972fbf.x10w94by.x1qhh985.x14e42zd.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x16tdsg8.x1hl2dhg.xggy1nq.x1fmog5m.xu25z0z.x140muxe.xo1y3bh.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3 > div.x1ja2u2z.x78zum5.x2lah0s.x1n2onr6.xl56j7k.x6s0dn4.xozqiw3.x1q0g3np.x9f619.x1qhmfi1.x1s9qjmn.x71vvrb.x7gj0x1.x167l43f.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x178xt8z.x1lun4ml.xso031l.xpilrb4.xj9xf8b.xku6xm2.x1ctn6jl.xf0qvnx.xp88ac2.x5ujcfi.x31k296
```
```Xpath
//*[@id="login-panel-container"]/div/div/div/div[3]/div/div/div
hoặc
//*[@id="login-panel-container"]/div/div/div/div[3]/div/div
```
Bước 2:
điền first name: ok
```CSS selector
#js_5
```
```Xpath
//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[2]/div/div[2]/div/div[1]/div[1]/div/div[2]/div
hoặc
//*[@id="js_5"]
```
Điền last name: oka
``` CSS selector
#js_a
```
``` Xpath
//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[2]/div/div[2]/div/div[1]/div[2]/div/div[2]/div/div[1]/div/div[1]/div[2]/div[1]/div
hoặc
//*[@id="js_a"]
```

Bước 3:
Bấm continue
```CSS selector
#globalContainer > div > div > div.x78zum5.xdt5ytf.xh8yej3.x5yr21d.x1g81zrj.xg6iff7.x1qughib.x1q85c4o.x1kgee58 > div.x6s0dn4.x78zum5.xdt5ytf.xl56j7k.x18hwk67.x1kb72lq.x2lwn1j.xeuugli.x14rvwrp.xjv05ge.x11t971q.x1chd833.xvc5jky:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x6s0dn4.x78zum5.x1q0g3np.x1qughib.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x8va1my.x1y1aw1k.xv54qhq.xwib8y2.xf7dkkf:nth-of-type(3) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xpdmqnj:nth-of-type(3)
```
```Xpath
//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]
```

Bước 4:
Continue tiếp
``` CSS selector
#globalContainer > div > div > div.x78zum5.xdt5ytf.xh8yej3.x5yr21d.x1g81zrj.xg6iff7.x1qughib.x1q85c4o.x1kgee58 > div.x6s0dn4.x78zum5.xdt5ytf.xl56j7k.x18hwk67.x1kb72lq.x2lwn1j.xeuugli.x14rvwrp.xjv05ge.x11t971q.x1chd833.xvc5jky:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x6s0dn4.x78zum5.x1q0g3np.x1qughib.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x8va1my.x1y1aw1k.xv54qhq.xwib8y2.xf7dkkf:nth-of-type(3) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xpdmqnj:nth-of-type(3)
```
```Xpath
//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]
//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]
```

Bước 5:
Accept invitation:
```CSS selector
#globalContainer > div > div > div.x78zum5.xdt5ytf.xh8yej3.x5yr21d.x1g81zrj.xg6iff7.x1qughib.x1q85c4o.x1kgee58 > div.x6s0dn4.x78zum5.xdt5ytf.xl56j7k.x18hwk67.x1kb72lq.x2lwn1j.xeuugli.x14rvwrp.xjv05ge.x11t971q.x1chd833.xvc5jky:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x6s0dn4.x78zum5.x1q0g3np.x1qughib.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x8va1my.x1y1aw1k.xv54qhq.xwib8y2.xf7dkkf:nth-of-type(3) > div.x3nfvp2.x193iq5w.xxymvpz.xeuugli.x2lah0s:nth-of-type(3) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xv54qhq
```
``` Xpath
//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/div
```

Bước 6: đợi khi nào page chuyển qua thành
https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id={Via-BM-ID}

Lưu Via-BM-ID đó để sau lưu thông tin vào report

Bước 7:
Từ Via-BM-ID đó, https://business.facebook.com/latest/settings/ad_accounts?business_id={Via-BM-ID} vào link với đường dẫn như vậy.

Đợi đến khi page load xong.

Bước 8:
```CSS selector
#js_6g
hoặc
#js_6g > a
hoặc
#js_6g > a.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.xdl72j9.xdt5ytf.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6.xggy1nq.x1ja2u2z.x1t137rt.xt0psk2.x1hl2dhg.xt0b8zv.x1vvvo52.xxio538.x1qsmy5i.xq9mrsl.x1yc453h.x1h4wwuj.x1qlqyl8.x1pd3egz
```
```Xpath
//*[@id="js_6g"]/a
hoặc
//*[@id="js_6g"]
```
Copy text ở đó hoặc click vào đó để copy

Đó chính là Via-UID-Ad-Account

-> Lưu vào bộ nhớ Via-UID-Ad-Account và chuyển qua profile BM trung gian



2.2 Giai đoạn 2 - automation profile BM trung gian:
Bước 1:Lấy Via-UID-Ad-Account vừa được chuyển qua, vào link:
https://business.facebook.com/latest/settings/ad_accounts?business_id=YOUR_BM_UID

Bước 2: Nhấn vào +Add
```Css selector
#mount_0_0_MY > div > div:nth-of-type(1) > div.x9f619.x1n2onr6.x1ja2u2z > div.x9f619.x1n2onr6.x1ja2u2z:nth-of-type(2) > div.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z > div.x78zum5.xdt5ytf.xg6iff7.x1n2onr6 > div.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z:nth-of-type(1) > span > div.x1qjc9v5.x78zum5.xdt5ytf.x13a6bvl.x2lwn1j.xeuugli > div.x1qjc9v5.x78zum5.x15zctf7.x13a6bvl.x2lwn1j.xeuugli.x1dr59a3 > div._6g3g.x1ja2u2z.xeuugli.xh8yej3.x1q85c4o.x1kgee58:nth-of-type(1) > div.x2atdfe.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z.xw2csxc.x7p5m3t.x1odjw0f.x1e4zzel.x5yr21d:nth-of-type(1) > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div:nth-of-type(2) > div > div > div.x78zum5.xdt5ytf.x1dr59a3.xh8yej3.x1vjfegm.x1q85c4o.x1kgee58 > div.x78zum5.x1dr59a3.xmz0i5r.x193iq5w.xw2csxc.xh8yej3 > div.xwxc41k.x13jy36j.x64bnmy.xyamay9.x6s0dn4.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div.x1q0g3np.xeuugli.x1iyjqo2.x14bzwq1.xqjyukv.x1qjc9v5.x78zum5.xozqiw3.x5yr21d.x2lwn1j.xh8yej3 > div.x1cy8zhl.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x1kxxb1g > div.x78zum5.x1q0g3np.xozqiw3.xeuugli.x1iyjqo2.x14bzwq1.x1qjc9v5.x5yr21d.x2lwn1j.xh8yej3.x1vjfegm:nth-of-type(2) > div.xqjyukv.x1qjc9v5.x78zum5.x1iyjqo2.xs83m0k.x5yr21d.x1szn6h9.xeuugli.xh8yej3:nth-of-type(2) > div.x1n2onr6.x1iyjqo2.xh8yej3.x5yr21d > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x6ikm8r.x10wlt62 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x2lah0s.xh8yej3.xyamay9.x1l90r2v.xf7dkkf.xv54qhq:nth-of-type(1) > div.x1iyjqo2.xeuugli > div > div.x6s0dn4.x78zum5.x2lwn1j.xeuugli > div.x78zum5.x1nhvcw1.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k > div.x1pha0wt.x78zum5.x1q0g3np.xl56j7k.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x8va1my > div.x1cy8zhl.x78zum5.x1q0g3np.x13a6bvl.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x8va1my:nth-of-type(2) > div.x3nfvp2.x193iq5w.xxymvpz.xeuugli.x2lah0s:nth-of-type(3) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xv54qhq.x1g0dm76
```
```Xpath
//*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div
hoặc
//*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span/div/div
```


Bước 3:
Click vào:
```CSS selector
#js_7l
hoặc
#js_7k > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my > div.x1io82uz.xh8yej3 > div > div.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x78zum5.xdl72j9.xdt5ytf.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt > div.x78zum5.x1iyjqo2 > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.x1y1aw1k.xwib8y2.xmzvs34.xf159sx.x1qfufaz.x1w5wx5t.x1n2onr6.xo1l8bm.xbsr9hj.x1v911su
hoặc
#js_7m
```
```Xpath
//*[@id="js_7m"]
hoặc
//*[@id="js_7l"]
hoặc
//*[@id="js_7k"]/div/div/div/div/div/div
```

Bước 4:
Nhập Via-UID-Ad-Account vừa nhận được vào:
```Css selector
#js_8m
```
```Xpath
//*[@id="js_8m"]
```

Sau đó nhấn next
```CSS selector
#facebook > body._8-5d._6s5d._71pn.system-fonts--body.segoe > span > div > div.x1dr59a3.xixxii4.x13vifvy.x1o0tod.xn9wirt.xbqvh2t.x68m4m9.x1hc1fzr.x1mbqufl.x6o7n8i.x16e9yqp.x12w9bfk:nth-of-type(1) > div.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x1nhvcw1.xg6iff7.xmzvs34.xf159sx.x1l90r2v:nth-of-type(1) > div.x1cy8zhl.x78zum5.xl56j7k.x47corl > div.x78zum5.xdt5ytf.x1t137rt.x71s49j.x1n2onr6.x1ja2u2z.x3oybdh.xofcydl.x6o7n8i.x1mow4s6.x12w9bfk > div.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.x1xp1s0c.x5yr21d.xh8yej3.x78zum5.x1q0g3np.xqui1pq.x1q85c4o.x1kgee58 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xh8yej3.x18d9i69.x1plvlek.xryxfnj:nth-of-type(1) > div.x78zum5.x1q0g3np.x5yr21d:nth-of-type(2) > div.x1iyjqo2.xeuugli:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x78zum5.xdt5ytf.xqui1pq > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x8va1my.xf7dkkf.xv54qhq.x1l90r2v.xz9dl7a.x1c4vz4f.x2lah0s:nth-of-type(3) > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my.x2lah0s.x13a6bvl > div.x3nfvp2.x193iq5w.xxymvpz.xeuugli.x2lah0s:nth-of-type(2) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xv54qhq


Hoặc

#facebook > body._8-5d._6s5d._71pn.system-fonts--body.segoe > span > div > div.x1dr59a3.xixxii4.x13vifvy.x1o0tod.xn9wirt.xbqvh2t.x68m4m9.x1hc1fzr.x1mbqufl.x6o7n8i.x16e9yqp.x12w9bfk:nth-of-type(1) > div.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x1nhvcw1.xg6iff7.xmzvs34.xf159sx.x1l90r2v:nth-of-type(1) > div.x1cy8zhl.x78zum5.xl56j7k.x47corl > div.x78zum5.xdt5ytf.x1t137rt.x71s49j.x1n2onr6.x1ja2u2z.x3oybdh.xofcydl.x6o7n8i.x1mow4s6.x12w9bfk > div.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.x1xp1s0c.x5yr21d.xh8yej3.x78zum5.x1q0g3np.xqui1pq.x1q85c4o.x1kgee58 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xh8yej3.x18d9i69.x1plvlek.xryxfnj:nth-of-type(1) > div.x78zum5.x1q0g3np.x5yr21d:nth-of-type(2) > div.x1iyjqo2.xeuugli:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x78zum5.xdt5ytf.xqui1pq > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x8va1my.xf7dkkf.xv54qhq.x1l90r2v.xz9dl7a.x1c4vz4f.x2lah0s:nth-of-type(3) > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my.x2lah0s.x13a6bvl > div.x3nfvp2.x193iq5w.xxymvpz.xeuugli.x2lah0s:nth-of-type(2) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xv54qhq > span.x1vvvo52.x1fvot60.xxio538.x1heor9g.xq9mrsl.x1h4wwuj.x1pd3egz.xeuugli.xh8yej3 > div.x78zum5 > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my.x1hc1fzr.x13dflua.x6o7n8i.xxziih7.x12w9bfk.xl56j7k.xh8yej3 > div.x1vvvo52.x1fvot60.xk50ysn.xxio538.x1heor9g.xuxw1ft.x6ikm8r.x10wlt62.xlyipyv.x1h4wwuj.xeuugli
```

```Xpath
//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div
hoặc
//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div
```

Bước 5:
Click vào để toggle full access role:
```Css selector
#facebook > body._8-5d._6s5d._71pn.system-fonts--body.segoe > span > div > div.x1dr59a3.xixxii4.x13vifvy.x1o0tod.xn9wirt.xbqvh2t.x68m4m9.x1hc1fzr.x1mbqufl.x6o7n8i.x16e9yqp.x12w9bfk:nth-of-type(1) > div.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x1nhvcw1.xg6iff7.xmzvs34.xf159sx.x1l90r2v:nth-of-type(1) > div.x1cy8zhl.x78zum5.xl56j7k.x47corl > div.x78zum5.xdt5ytf.x1t137rt.x71s49j.x1n2onr6.x1ja2u2z.x3oybdh.xofcydl.x6o7n8i.x1mow4s6.x12w9bfk > div.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.x1xp1s0c.x5yr21d.xh8yej3.x78zum5.x1q0g3np.xqui1pq.x1q85c4o.x1kgee58 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xh8yej3.x18d9i69.x1plvlek.xryxfnj:nth-of-type(1) > div.x78zum5.x1q0g3np.x5yr21d:nth-of-type(2) > div.x1iyjqo2.xeuugli:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x78zum5.xdt5ytf.xqui1pq > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3:nth-of-type(2) > div.xw2csxc.x1odjw0f.xjkvuk6.xh8yej3:nth-of-type(1) > div.x1iyjqo2.xs83m0k.xdl72j9.x3igimt.xedcshv.x1t2pt76.xyamay9.x1l90r2v.xf7dkkf.xv54qhq.x178xt8z.x13fuv20.xwebqov.x1x9jw1y.xrsgblv.xceihxd:nth-of-type(3) > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x1kxxb1g > div:nth-of-type(2) > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x:nth-of-type(2) > div > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x > span > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x8va1my.x1c4vz4f > div.x1rg5ohu.x1n2onr6.x3oybdh:nth-of-type(1) > div.x1n2onr6.xh8yej3 > div.x6s0dn4.x78zum5.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x178xt8z.x1lun4ml.xso031l.xpilrb4.xwebqov.x1x9jw1y.xrsgblv.xceihxd.x1iwo8zk.x1033uif.x179ill4.x1b60jn0.x1gzqxud.xbsr9hj.x13dflua.xxziih7.x12w9bfk.x14qfxbe.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x15406qy:nth-of-type(1)

Hoặc
#facebook > body._8-5d._6s5d._71pn.system-fonts--body.segoe > span > div > div.x1dr59a3.xixxii4.x13vifvy.x1o0tod.xn9wirt.xbqvh2t.x68m4m9.x1hc1fzr.x1mbqufl.x6o7n8i.x16e9yqp.x12w9bfk:nth-of-type(1) > div.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x1nhvcw1.xg6iff7.xmzvs34.xf159sx.x1l90r2v:nth-of-type(1) > div.x1cy8zhl.x78zum5.xl56j7k.x47corl > div.x78zum5.xdt5ytf.x1t137rt.x71s49j.x1n2onr6.x1ja2u2z.x3oybdh.xofcydl.x6o7n8i.x1mow4s6.x12w9bfk > div.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.x1xp1s0c.x5yr21d.xh8yej3.x78zum5.x1q0g3np.xqui1pq.x1q85c4o.x1kgee58 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xh8yej3.x18d9i69.x1plvlek.xryxfnj:nth-of-type(1) > div.x78zum5.x1q0g3np.x5yr21d:nth-of-type(2) > div.x1iyjqo2.xeuugli:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x78zum5.xdt5ytf.xqui1pq > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3:nth-of-type(2) > div.xw2csxc.x1odjw0f.xjkvuk6.xh8yej3:nth-of-type(1) > div.x1iyjqo2.xs83m0k.xdl72j9.x3igimt.xedcshv.x1t2pt76.xyamay9.x1l90r2v.xf7dkkf.xv54qhq.x178xt8z.x13fuv20.xwebqov.x1x9jw1y.xrsgblv.xceihxd:nth-of-type(3) > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x1kxxb1g > div:nth-of-type(2) > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x:nth-of-type(2) > div > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli > div.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.xavht8x > span > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x8va1my.x1c4vz4f > div.x1rg5ohu.x1n2onr6.x3oybdh:nth-of-type(1) > div.x1n2onr6.xh8yej3 > div.x6s0dn4.x78zum5.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x178xt8z.x1lun4ml.xso031l.xpilrb4.xwebqov.x1x9jw1y.xrsgblv.xceihxd.x1iwo8zk.x1033uif.x179ill4.x1b60jn0.x1gzqxud.xbsr9hj.x13dflua.xxziih7.x12w9bfk.x14qfxbe.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x15406qy:nth-of-type(1) > div.xw4jnvo.x1qx5ct2.x12y6twl.x1h45990.x1iwo8zk.x1033uif.x179ill4.x1b60jn0.x13dflua.x6o7n8i.xxziih7.x12w9bfk.x4s1yf2:nth-of-type(2)
```
```Xpath
//*[@id="js_95"]
Hoặc
//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[1]
Hoặc
//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[2]
```

Sau đó, click confirm để hoàn thành

```Css selector
#js_8y
Hoặc
#js_8y > span.x1vvvo52.x1fvot60.xxio538.x1heor9g.xq9mrsl.x1h4wwuj.x1pd3egz.xeuugli.xh8yej3 > div.x78zum5 > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my.x1hc1fzr.x13dflua.x6o7n8i.xxziih7.x12w9bfk.xl56j7k.xh8yej3 > div.x1vvvo52.x1fvot60.xk50ysn.xxio538.x1heor9g.xuxw1ft.x6ikm8r.x10wlt62.xlyipyv.x1h4wwuj.xeuugli
```
``` Xpath
//*[@id="js_8y"]/span/div/div/div
hoặc
//*[@id="js_8y"]/span/div/div/div
```

Bước 6:
Click done để hoàn tất và chuyển về profile via để approve role setup

```Css selector
#facebook > body._8-5d._6s5d._71pn.system-fonts--body.segoe > span > div > div.x1dr59a3.xixxii4.x13vifvy.x1o0tod.xn9wirt.xbqvh2t.x68m4m9.x1hc1fzr.x1mbqufl.x6o7n8i.x16e9yqp.x12w9bfk:nth-of-type(1) > div.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x1nhvcw1.xg6iff7.xmzvs34.xf159sx.x1l90r2v:nth-of-type(1) > div.x1cy8zhl.x78zum5.xl56j7k.x47corl > div.x78zum5.xdt5ytf.x1t137rt.x71s49j.x1n2onr6.x1ja2u2z.x3oybdh.xofcydl.x6o7n8i.x1mow4s6.x12w9bfk > div.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.x1xp1s0c.x5yr21d.xh8yej3.x78zum5.x1q0g3np.xqui1pq.x1q85c4o.x1kgee58 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3 > div.xh8yej3.x18d9i69.x1plvlek.xryxfnj:nth-of-type(1) > div.x78zum5.x1q0g3np.x5yr21d:nth-of-type(2) > div.x1iyjqo2.xeuugli:nth-of-type(2) > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x78zum5.xdt5ytf.xqui1pq > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x8va1my.xf7dkkf.xv54qhq.x1l90r2v.xz9dl7a.x1c4vz4f.x2lah0s:nth-of-type(3) > div.x6s0dn4.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x8va1my.x2lah0s.x13a6bvl > div.x3nfvp2.x193iq5w.xxymvpz.xeuugli.x2lah0s > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xv54qhq
```

```Xpath
//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div
hoặc
//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div/span/div/div/div
```

2.3 Giai đoạn 2-via approve role setup

về profile via sau khi Bm hoàn tất set role, truy cập link
https://business.facebook.com/latest/settings/requests?business_id={Via-BM-ID}

Đợi load xong, click vào request trong bảng
```Css selector
#mount_0_0_6U > div > div:nth-of-type(1) > div.x9f619.x1n2onr6.x1ja2u2z > div.x9f619.x1n2onr6.x1ja2u2z:nth-of-type(2) > div.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z > div.x78zum5.xdt5ytf.xg6iff7.x1n2onr6 > div.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z:nth-of-type(1) > span > div.x1qjc9v5.x78zum5.xdt5ytf.x13a6bvl.x2lwn1j.xeuugli > div.x1qjc9v5.x78zum5.x15zctf7.x13a6bvl.x2lwn1j.xeuugli.x1dr59a3 > div._6g3g.x1ja2u2z.xeuugli.xh8yej3.x1q85c4o.x1kgee58:nth-of-type(1) > div.x2atdfe.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z.xw2csxc.x7p5m3t.x1odjw0f.x1e4zzel.x5yr21d:nth-of-type(1) > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div:nth-of-type(2) > div > div > div.x78zum5.xdt5ytf.x1dr59a3.xh8yej3.x1vjfegm.x1q85c4o.x1kgee58 > div.x78zum5.x1dr59a3.xmz0i5r.x193iq5w.xw2csxc.xh8yej3 > div.xwxc41k.x13jy36j.x64bnmy.xyamay9.x6s0dn4.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div.x1q0g3np.xeuugli.x1iyjqo2.x14bzwq1.xqjyukv.x1qjc9v5.x78zum5.xozqiw3.x5yr21d.x2lwn1j.xh8yej3 > div.x1cy8zhl.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x1kxxb1g > div.x78zum5.x1q0g3np.xozqiw3.xeuugli.x1iyjqo2.x14bzwq1.x1qjc9v5.x5yr21d.x2lwn1j.xh8yej3.x1vjfegm:nth-of-type(2) > div.xqjyukv.x1qjc9v5.x78zum5.x1iyjqo2.xs83m0k.x5yr21d.x1szn6h9.xeuugli.xh8yej3:nth-of-type(2) > div.x1n2onr6.x1iyjqo2.xh8yej3.x5yr21d > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x6ikm8r.x10wlt62 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3:nth-of-type(2) > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x178xt8z.x13fuv20.xe3zbwb.x1pbl59p.x9f619.x5yr21d.x1n2onr6:nth-of-type(2) > div.x78zum5.x2lwn1j.xeuugli.x5yr21d.xh8yej3.xw2csxc.x1odjw0f > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x1iyjqo2 > div.x78zum5.x193iq5w.xmz0i5r.xeaf4i8.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x1r8uery.xw2csxc.x1odjw0f.x1gzqxud > div.x1iyjqo2.x1n2onr6.x193iq5w.xmz0i5r.x1ja2u2z > table.x1lliihq.xh8yej3.x5yr21d.xw2csxc.x1odjw0f.x1mzt3pk.x14qo4ti.x1pier6b.xm3fktu > tbody.x1lliihq.xh8yej3.x1n2onr6.x1ja2u2z > tr.xwebqov.x1x9jw1y.xrsgblv.xceihxd.xso031l.x9f619.x1sy0etr.x1ypdohk.x1om68hv.x13wx0b2 > td.x1n2onr6.x1yc453h.x78zum5.x1nhvcw1.xwebqov.x1x9jw1y.xrsgblv.xceihxd.x1gzqxud.xbsr9hj.x1vvvo52.x1fvot60.xo1l8bm.xxio538.xyamay9.xv54qhq.x1l90r2v.xf7dkkf.x6s0dn4:nth-of-type(1)

Hoặc
#mount_0_0_6U > div > div:nth-of-type(1) > div.x9f619.x1n2onr6.x1ja2u2z > div.x9f619.x1n2onr6.x1ja2u2z:nth-of-type(2) > div.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z > div.x78zum5.xdt5ytf.xg6iff7.x1n2onr6 > div.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z:nth-of-type(1) > span > div.x1qjc9v5.x78zum5.xdt5ytf.x13a6bvl.x2lwn1j.xeuugli > div.x1qjc9v5.x78zum5.x15zctf7.x13a6bvl.x2lwn1j.xeuugli.x1dr59a3 > div._6g3g.x1ja2u2z.xeuugli.xh8yej3.x1q85c4o.x1kgee58:nth-of-type(1) > div.x2atdfe.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z.xw2csxc.x7p5m3t.x1odjw0f.x1e4zzel.x5yr21d:nth-of-type(1) > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div:nth-of-type(2) > div > div > div.x78zum5.xdt5ytf.x1dr59a3.xh8yej3.x1vjfegm.x1q85c4o.x1kgee58 > div.x78zum5.x1dr59a3.xmz0i5r.x193iq5w.xw2csxc.xh8yej3 > div.xwxc41k.x13jy36j.x64bnmy.xyamay9.x6s0dn4.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div.x1q0g3np.xeuugli.x1iyjqo2.x14bzwq1.xqjyukv.x1qjc9v5.x78zum5.xozqiw3.x5yr21d.x2lwn1j.xh8yej3 > div.x1cy8zhl.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x1kxxb1g > div.x78zum5.x1q0g3np.xozqiw3.xeuugli.x1iyjqo2.x14bzwq1.x1qjc9v5.x5yr21d.x2lwn1j.xh8yej3.x1vjfegm:nth-of-type(2) > div.xqjyukv.x1qjc9v5.x78zum5.x1iyjqo2.xs83m0k.x5yr21d.x1szn6h9.xeuugli.xh8yej3:nth-of-type(2) > div.x1n2onr6.x1iyjqo2.xh8yej3.x5yr21d > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x6ikm8r.x10wlt62 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3:nth-of-type(2) > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x178xt8z.x13fuv20.xe3zbwb.x1pbl59p.x9f619.x5yr21d.x1n2onr6:nth-of-type(2) > div.x78zum5.x2lwn1j.xeuugli.x5yr21d.xh8yej3.xw2csxc.x1odjw0f > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x1iyjqo2 > div.x78zum5.x193iq5w.xmz0i5r.xeaf4i8.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x1r8uery.xw2csxc.x1odjw0f.x1gzqxud > div.x1iyjqo2.x1n2onr6.x193iq5w.xmz0i5r.x1ja2u2z > table.x1lliihq.xh8yej3.x5yr21d.xw2csxc.x1odjw0f.x1mzt3pk.x14qo4ti.x1pier6b.xm3fktu > tbody.x1lliihq.xh8yej3.x1n2onr6.x1ja2u2z > tr.xwebqov.x1x9jw1y.xrsgblv.xceihxd.xso031l.x9f619.x1sy0etr.x1ypdohk.x1om68hv.x13wx0b2 > td.x1n2onr6.x78zum5.xp4054r.x13a6bvl.xwebqov.x1x9jw1y.xrsgblv.xceihxd.x1gzqxud.xbsr9hj.x1vvvo52.x1fvot60.xo1l8bm.xxio538.xyamay9.xv54qhq.x1l90r2v.xf7dkkf.x6s0dn4:nth-of-type(2)

Hoặc
#mount_0_0_6U > div > div:nth-of-type(1) > div.x9f619.x1n2onr6.x1ja2u2z > div.x9f619.x1n2onr6.x1ja2u2z:nth-of-type(2) > div.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z > div.x78zum5.xdt5ytf.xg6iff7.x1n2onr6 > div.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z:nth-of-type(1) > span > div.x1qjc9v5.x78zum5.xdt5ytf.x13a6bvl.x2lwn1j.xeuugli > div.x1qjc9v5.x78zum5.x15zctf7.x13a6bvl.x2lwn1j.xeuugli.x1dr59a3 > div._6g3g.x1ja2u2z.xeuugli.xh8yej3.x1q85c4o.x1kgee58:nth-of-type(1) > div.x2atdfe.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z.xw2csxc.x7p5m3t.x1odjw0f.x1e4zzel.x5yr21d:nth-of-type(1) > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div:nth-of-type(2) > div > div > div.x78zum5.xdt5ytf.x1dr59a3.xh8yej3.x1vjfegm.x1q85c4o.x1kgee58 > div.x78zum5.x1dr59a3.xmz0i5r.x193iq5w.xw2csxc.xh8yej3 > div.xwxc41k.x13jy36j.x64bnmy.xyamay9.x6s0dn4.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div.x1q0g3np.xeuugli.x1iyjqo2.x14bzwq1.xqjyukv.x1qjc9v5.x78zum5.xozqiw3.x5yr21d.x2lwn1j.xh8yej3 > div.x1cy8zhl.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x1kxxb1g > div.x78zum5.x1q0g3np.xozqiw3.xeuugli.x1iyjqo2.x14bzwq1.x1qjc9v5.x5yr21d.x2lwn1j.xh8yej3.x1vjfegm:nth-of-type(2) > div.xqjyukv.x1qjc9v5.x78zum5.x1iyjqo2.xs83m0k.x5yr21d.x1szn6h9.xeuugli.xh8yej3:nth-of-type(2) > div.x1n2onr6.x1iyjqo2.xh8yej3.x5yr21d > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x6ikm8r.x10wlt62 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3:nth-of-type(2) > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x178xt8z.x13fuv20.xe3zbwb.x1pbl59p.x9f619.x5yr21d.x1n2onr6:nth-of-type(2) > div.x78zum5.x2lwn1j.xeuugli.x5yr21d.xh8yej3.xw2csxc.x1odjw0f > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x1iyjqo2 > div.x78zum5.x193iq5w.xmz0i5r.xeaf4i8.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x1r8uery.xw2csxc.x1odjw0f.x1gzqxud > div.x1iyjqo2.x1n2onr6.x193iq5w.xmz0i5r.x1ja2u2z > table.x1lliihq.xh8yej3.x5yr21d.xw2csxc.x1odjw0f.x1mzt3pk.x14qo4ti.x1pier6b.xm3fktu > tbody.x1lliihq.xh8yej3.x1n2onr6.x1ja2u2z > tr.xwebqov.x1x9jw1y.xrsgblv.xceihxd.xso031l.x9f619.x1sy0etr.x1ypdohk.x1om68hv.x13wx0b2 > td.x1n2onr6.x78zum5.xp4054r.x13a6bvl.xwebqov.x1x9jw1y.xrsgblv.xceihxd.x1gzqxud.xbsr9hj.x1vvvo52.x1fvot60.xo1l8bm.xxio538.xyamay9.xv54qhq.x1l90r2v.xf7dkkf.x6s0dn4:nth-of-type(3)
```
```Xpath
//*[@id="mount_0_0_OJ"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr
Hoặc
//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[1]
Hoặc
//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[2]
```


Bước 2:

Chọn approve
```CSS Selector
#mount_0_0_1J > div > div:nth-of-type(1) > div.x9f619.x1n2onr6.x1ja2u2z > div.x9f619.x1n2onr6.x1ja2u2z:nth-of-type(2) > div.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z > div.x78zum5.xdt5ytf.xg6iff7.x1n2onr6 > div.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z:nth-of-type(1) > span > div.x1qjc9v5.x78zum5.xdt5ytf.x13a6bvl.x2lwn1j.xeuugli > div.x1qjc9v5.x78zum5.x15zctf7.x13a6bvl.x2lwn1j.xeuugli.x1dr59a3 > div._6g3g.x1ja2u2z.xeuugli.xh8yej3.x1q85c4o.x1kgee58:nth-of-type(1) > div.x2atdfe.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x1n2onr6.x1ja2u2z.xw2csxc.x7p5m3t.x1odjw0f.x1e4zzel.x5yr21d:nth-of-type(1) > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div:nth-of-type(2) > div > div > div.x78zum5.xdt5ytf.x1dr59a3.xh8yej3.x1vjfegm.x1q85c4o.x1kgee58 > div.x78zum5.x1dr59a3.xmz0i5r.x193iq5w.xw2csxc.xh8yej3 > div.xwxc41k.x13jy36j.x64bnmy.xyamay9.x6s0dn4.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div.x1q0g3np.xeuugli.x1iyjqo2.x14bzwq1.xqjyukv.x1qjc9v5.x78zum5.xozqiw3.x5yr21d.x2lwn1j.xh8yej3 > div.x1cy8zhl.x78zum5.xdt5ytf.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.x1kxxb1g > div.x78zum5.x1q0g3np.xozqiw3.xeuugli.x1iyjqo2.x14bzwq1.x1qjc9v5.x5yr21d.x2lwn1j.xh8yej3.x1vjfegm:nth-of-type(2) > div.xqjyukv.x1qjc9v5.x78zum5.x1iyjqo2.xs83m0k.x5yr21d.x1szn6h9.xeuugli.xh8yej3:nth-of-type(2) > div.x1n2onr6.x1iyjqo2.xh8yej3.x5yr21d > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div.x1gzqxud.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xhgxa4x.xy5ysw6.x1qkj6lk.xn3walq.xnvurfn.x1v3rft4.x1opv7go.x1rovbrg.xibdhds.x1ftkm3c.xhvrwov.x368b2g.xwx4but.x1cpjm7i.xszcg87.x1hmns74.xkk1bqk.xplokhz.xsxiz9q.x1rmj1tg.xchklzq.x9f619.xc8icb0.x1n2onr6.x1pvq41x.xfijbtm.xfenqrj.xgy0gl7.x19igvu.x1s928wv.x1wsn0xg.x1j6awrg.x1iygr5g.x1m1drc7.x4eaejv.xi4xitw.x5yr21d.xh8yej3.x6ikm8r.x10wlt62 > div.x78zum5.xdt5ytf.x5yr21d.xedcshv.x1t2pt76.xh8yej3 > div.x9f619.x78zum5.x1iyjqo2.x5yr21d.x2lwn1j.x1n2onr6.xh8yej3:nth-of-type(2) > div.xw2csxc.x1odjw0f.xh8yej3.x18d9i69:nth-of-type(1) > div.x178xt8z.x13fuv20.xe3zbwb.x1pbl59p.x9f619.x5yr21d.x1n2onr6:nth-of-type(2) > div.x2izyaf.xpilrb4.x1t7ytsu.xmhecdf.xl1moc1.x9f619.x5yr21d.x10l6tqk.x13vifvy.x3m8u43.x65xoit.xw2csxc.x1odjw0f:nth-of-type(2) > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div > div.x78zum5.xdt5ytf.x2lwn1j.xeuugli.x5yr21d > div.x1p5oq8j.x64bnmy.x18d9i69.x13jy36j.xh8yej3.x9f619:nth-of-type(1) > div.x6s0dn4.x78zum5.x1q0g3np.x1qughib.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x14bzwq1 > div.xuk3077.x78zum5.x1qughib.x2lwn1j.xeuugli.x2lah0s:nth-of-type(2) > div.x1cy8zhl.x78zum5.x1q0g3np.xozqiw3.x2lwn1j.xeuugli.x1iyjqo2.xs83m0k.x8va1my > div.x3nfvp2.x193iq5w.xxymvpz.xeuugli.x2lah0s:nth-of-type(2) > div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x16tdsg8.xggy1nq.x1ja2u2z.x1t137rt.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x3nfvp2.xdl72j9.x1q0g3np.x2lah0s.x193iq5w.x1n2onr6.x1hl2dhg.x87ps6o.xxymvpz.xlh3980.xvmahel.x1lku1pv.x1g40iwv.x1g2r6go.x16e9yqp.x12w9bfk.x15406qy.xjwep3j.x1t39747.x1wcsgtt.x1pczhz8.xo1l8bm.x140t73q.x7nezuk.x1y1aw1k.xwib8y2.xf7dkkf.xv54qhq
```

```Xpath
//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div

Hoặc
//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div/span/div/div/div
```


Hoàn tất 1 chu trình share nhận bm, lưu lại
{Via-BM-ID}, YOUR_BM_UID, Via-UID-Ad-Account đẩy vào report đánh dấu hoàn thành share nhận cho link vừa dùng