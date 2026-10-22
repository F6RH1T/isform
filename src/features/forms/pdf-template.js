import { CIHAZ } from "./form-ui.js";

const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ===== PDF ŞABLONU (taşma korumalı) =====
   - table-layout:fixed + colgroup  → uzun metin tabloyu asla genişletemez
   - kir()                          → uzun kelimelere <wbr> koyar (html2canvas dahil her yerde satır kırılır)
   - sabit A4 sayfa (794x1123)      → içerik sayfayı asla şişirmez
   - açıklama alanı sığmazsa        → önce küçülür, yine sığmazsa 2/2, 3/3… sayfalara devam eder */
const kir = (s, n = 14) => String(s ?? "").split(/(\s+)/).map(t => {
  if (!t) return "";
  if (/^\s+$/.test(t)) return esc(t);
  const ch = Array.from(t);
  if (ch.length <= n) return esc(t);
  const parca = [];
  for (let i = 0; i < ch.length; i += n) parca.push(esc(ch.slice(i, i + n).join("")));
  return parca.join("<wbr>");
}).join("");

/* ENORPA logosu — gömülü (logo.png dosyasına bağımlı değil) */
const ENORPA_LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYgAAACACAMAAAAmuQ7NAAAB/lBMVEXkZ17mXx0eLBIkGVLln5+rb6urXWdtaBKxYCIOYhFgFGARGBs3PEAqW1sUGyDaURr0PhVkDAvtTAj0ZKk4PUB/f/+wsLAdIydBPTy3PBD2qvY7QEKqqv//AP/taUFUVGJ///+/P7//f/9FQUJVVarloXI9QUYzZpkAf/9GQD+/P3+qVf+qqlUAAAA7QEExNjg6PkDyYy8vNjYoKS4wNTcnLS8lKS4wNDclKi4mKy0vNDclKi7/AAAtMjYXKCosMzYcJCcXGhoYGS8nLDDvXCPuUgknLDAbIyfoVhroWiYcIiXoWysTGhsLOjroXCfwYi42N0nsZTUrMTTuYjEZHSQWHCLwWBrvXCTqWS8PGBsWHSHoVBb//wAAADLqYzTYWTExGTHuTgPrXCodJCjlVh3pYS0vAC/uXivsYzLtYicmJkxVVVXMZpn////nSgnlTRTwaUsAAFUAAH/SZjLUf38AAP8AVVXYUxftVBAHDBIA//9DNzcsAAARGR0dIyh/f38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACohDiSAAAAgHRSTlMJCxAIBAQFCQcEB6+bCGZWCwi2BM4CA+GvBQPFAwGjCwIEArADBa4FArIEAwMA/vT+/RUUzecwsU/Vj24BbRErLQ0Oj+vTrk1RUtQtJgZo0REVUrEsSuPVFcvOLAEFLA8L0Y9qYWsFq5JRBwMFASZSEgMCCQYBA1YPKQEXBUeOAvS0DxwAACBkSURBVHja7Z2Je9PGtsCVhIYAhUJb2tf72rvftwsZjSRLVixbcmLFduxsTshCFgghC4WGtdBe4F9/58xI8kjWZidAHi/z8QVvGs2cn84yuyCe9TQprt5vwd/PPAlnv4jvf7k3MyGeg/jk6cLMvQfPz0F8YrsE6b9mpmeeixcnJ89BfCIIF+96GjE9I3ifTJ6D+OiqQEu3fbxwLMzcm1k9XlgQxntfnIP4eBSEhdZGo3OwtLTwy71fhD8uHXQaG63tCRZInYP4KPGqKK6ubuwdzE2tTN2+facFILbmbt+Gd3NLndbC8WepF8IZxAC60Fm6AwxooiBac967qTtLnY3Vic8PxRkDAeKdeN24H1CANBcCQVnsN1YXPjcSwhnDILxu7K/cDiUAMbM1F/poBVAInxcK4WxZpZGZ/akpXuRTK9MbEL5u3aH+gvt8v/H6s/Lawlni8Lp1f7on7inwzXuNjSfbM9MPhFar0Vma403W9P3WyGdEQjhDHJ435gJBT00v7bW2joURUfxuZrrzsyiOHx+DE9/nSM2BUkyegzh1DtudOwGGub2NVeEl8xvvUSM8iQsLG3tLAYqVz6hbloIYtTFZhMgy/mNJjkmEv5T+dJB7XcIrRpNAbN33BbyydNjCck3evYtiBo148EXvrbBwGLjzqf1WIojYCoQqQ9rJ5ZdJ1sX2IFXftEisDEMg7NFanSZDyUjFshZk42ilolI0q/lRWGYRstCd2C9HWkuBNmBExDliH0TQ6Ba2G4FW3Gn8EJufXYXiZdanBOWPq8BotVbMvFTXrHwVl4mmm6w4xWJJr8bKTBBJzZByJ0P3HgRiGt4HOzk5aHV6gVrTYr683vDj07nO1vNwcw07/b6IBLmtzlxA4nos9JyVUhVT65MLyXW1qtR0ImdV+4joJcUIX1eKYSiM1iSp4KVbt+BfkAoxCQT/kBVVhatu4QdmPh3Viuw2klTvfyBe+xym7jQWoq3mKAj6/Wpr31OKOzPX+8yTTYuXlbCKIBgl+mjYJogkvv78pXgxKPjLtFoTzSyi8Au36CX+ZZJidiNiE3RDupU/FSSlSsUaXAUk8ugEKUkeZEmNXjAp+g3nqftg86PtNAQx3t8ruOD79juNvvG76gCVKqBah54NLe/VIFO1rqU8iFS1KLfodSA27SgEoigVbg1EQv8nWL1yr6j5dEJTgttIRRLhsOX5h+nOcUxzGUFMxDTCR2Z8ElGPTcoDVQqeLtOKe2ZyJHy4k6pv60XEkIRfMXk5CIWBOEAGZbic8PiAxGg2iN4FBUMLc1jd9x/t7bhuCwTxc1y8+0MjIBGOYuUBny4QJycUWRnoatBwkqgOhVRN5G2iMFiJEYQcrSmQyIyddJUDMRtuT3txK+UQcymAePCzmEri/mroyoFBIAmrB2JQirW46ms1KaMU4GJ6JIRbA4OYpzUN5ZhNIhGEuNrocYhNP87c6yS0O697JKY6od4OMjAIqIJuDQkCKdpxwYmUwybqw4KQFE28FAWBJOThQASOeqqzndBKftz4uvFzUmvcI3GnIZxII1jFhgSB1smOCRJzeSd9OBAFqUTEZ30goBoZsVMCCDRMXry0ndhbMfJkJLFfZOQBa2Xv88ZpfggQhcDADA6CozgQB0pCiwGRGXmDVavEP3JZ1ilJI8Yb01SQS1tD9RqBTngg9xZ6GYRBpDYH+BpoPog8MonIMxwJkloMh5jr6JVaH4hCdsO6pCXpfiQaywciiJjmWmnSHplMIeGNGc214kGkVqoQpxI8iEK+azGqHw23CPsg+JcV+jTRioAAOOX0tOi3zOOMcLpOxIKYFIXOFHMQC0N3o040VqJZ8CBSKlVSQvKSjGqfaUq6ulRUQijCKhFtEdK2dLEEl5UUJcoCXL0cBVG+ZDvzfi/hfC/J8tWrsnzp6o1Ub5jqsWNB3BVbzNfup3ZnjyxMpBmnVWacpjeCPH7vFQ+c2ny73ZZ3HMdpewleOjs7O/NyxeSbDPBURzUCr74xPz+246WxMZDGGPwlcqWshEnor5KCNqBQ1jT5yB6VZaKVixFtYm4iBEK/lPMpjA9LgIQzmGkSWOi60kgdFmktpRouL+6a6viDFhEQKfGcoytSpK0aAYHBesK1i8UQxeA+D/WIyVNMvo9vlJhhTWQ2MQyC5AcRH4wn6kQciElxYYmNKmynKcR/N6YbX6SBGGEtQvASd2M1Iq0LTOe9SVGOmCa4+mp6P2ZPekHgFFYIbLVFHk8Z23pRlQiDsE4G4la40yZbI5hCTDXep93si8a9zjfpKnGHZSP0K2y6RlCppYNIw8h3mBZUr0Ug61EOcb30qhRpE4RBbJ4QRLLHjgERhJ5L6Z76D42vv/pRzOElgnwGACFzPXwFpTIYCMfk9clrSZGwxWLxftqVEFKBSoRBPDwpiMRe8RgQd33jvredHjJtf7WdXpz3h1Sz7vju+k/5QdhlHoQ2GAi+Tzm4kca3BxM4gE7UQrhM+7RBxDX3E03TzEpc32l/+ntWq87zNb5tujyAaSqfQCN4OfiGLdQFLymLSZdWlLB3OjmIQiSAiu8W7gcxKT5njYj7mW2IzK9XWU4Hz9lPLw/pIxR5UBAhwyZHA0pq/BPSP/Wwpz8xCCi+Eg2bY3SiH8Td4DleOPlklJlQ3PR7fhA6L/Ui6QNRzq1Pt5hhqyhxkVT8I1DgPP2Jw1eo6WJkACTOOoVA0BbsRXGDBjtzmb1MgpCxlvGu188x5TmJ/M5aC6l2SR4URJ9GvOQrmnrvo3LI05+CRpSI3q8TTiYIiDpXvFjnbrrh2ToQXmbZpgOmXBPRhy2tJUDscEtA0tsDgghbBsK6mbirF9v5PD049RCIkpaQqqPESgYhi30k1CgJDoTfp+P1Mx1kuYjvGtN7LzKeDOZu/L50Eupr0qusDpGk6XpNCQ80auKAILQ+wxbj/HN0TwBFIfQgq0nJqIcae1EQT7V+ElY6CPDVB+FmWHKDbnrvmywd3VjhWhIk3PuaVCkp0m9X2xkURKhdTu0QZ6x855/LrhXyjkeE52pEQeCzke6xQyBmuZhzZSZLxl/MZGrEXXFjmjNzv4csTt7xCH+wLD+ISgg49bAhq1icz9uEuXUr9whdaPJPGMS8GEcirBM8iOYsC5qog13ZyPLVoBGdDBAjYus2Fzb9flojdOkgQsM/fmuwv2WROAVVHwpEgZ+h168RtBM+xWNHQNyg0evK9PTKvevJICYDEEKWRizMYWbTT+CaSfHivwwxZm3EjFmngiD88E8Q++YHcWk4EBDruqkg4nSCJIF4Jv72UmhtPHmyMSI8fnzz5m803fyN/fgn/8Xjx3/+8+M/AIhvHv/4+PFj9uFvN3/yMr35+K83b978K3zz+B+tjQ3I7oeXN3/7j2FAcCF3GERCRC+Phqdp+F1NA4BoDwtC0tNBxOkEiQUxuvXrrzNBOmz0XuOsmJEt+gLCqq1D/O7wYOX+IU1b+PVr+HYDV6hcbx0esqu+wp/94ufx68bgIPi5SeGWdYVPvThS7xve0/ol8+ViJTFpWqU0NIiH6SDiPLYTB+LGwfS96enpezRNc+nrDTD3C/vwovV4UhQO2KcrUyve16/h6ydfw4sRcUJ8/TV/6b1edl9P/G3gmX7cpDt+qDRtzDo8+uM9c6FeOHY1jo5mD3sPYpqqSQ06frA2wTqFNWLkq19/xX9fwZ8HnQcsdTp7h1QjGnudBsahwtbe3l6n0zlYWYK/8Nr7utNp4IsFeAEJL+w8AI34imaHGV/824BzX0OTH/NMpykUEjxMuDuU/izfpNZBnLWVCaJvPk9gnSLh679fvfx+BHzExpPrq99d+BmS8I8LLwRv0vf4NxeYN3hx4cWL8XHwERe+GH/x4gJrX3/34sWf6Yu/vhAEYXx8/MKFC18ILfA3T55MXL34pz+Jv//nICAKkUGUYeY1SWY7s1/6lEBA+Cpmg+gn4elEXzsiT9TE0l/oGrqsPo59GjWxWFjO7yPYIodQk2dwEL3Q95RAxLR4uBUqdh4QcX6CpLYjnog3kvu9J1mDrjMeXR0RfjHhjTF57Yh4EIVYo6QWTRKeMzEwiAI3HHoqIMCvoGvxk+9S6JtSN6XTL3W2ISNxgpb1H2YyG3STXst6bqEPRCFxUhg2potlzTqKRqbKoCsVuN7u0wABQTPf0RcO2kjiwJBUssRsEjF9Tdt5+5pmMht0/mDfEpsB+3uo02+xotEqVKLd9Vhh51l/E0EpDKsPpwUi9+QBkgYiloTW1w0e9L6uZjgJbFn/nKEQLK+pA9b7ejF+PKK/u97QY4Z1BwJRiEzTIKcDYuxUQMR57EUpaTxiLsd4xFbmoHVIu5JG6DZjSIyeBARdC0fE0wfxcBgQNUvMJCHxI2GDjtCNHB+f1gidHm3oKP06kRdEgbr6yLrxTwrCTu8gjs4w8ECc4pg1KNeUx/RuxlBpn04offY4DCJliYKklHTyXkwBkbm++KQg5CwQaSs1AtP0fC/fEF3atPzQpHJ/hlnK5IEbfTrR5yfydHGoqgEUqtbFtEc0c5lD4SOASCERndfUm7M6tEKwVRZTnYkck5Bj/ISTCAIae/GpG793RGR6ziJN/HX8B0mdfqcLIplE30y/rAB25EnWTL9GeKZa+nSarNgp3Psqv+e2QqGz+jc3N58mj/ZEusGPErdVeZXYDX7KIBJJ9Oa+Hh/c5qL/pPTbzNdps8Hp3FdqmYJJ5RnzmjJIDDBmnQ0iJY2lgLBOE0QSiZjZ4EJ6g+5easu6Nxvc7wjJmunXT4If1v1YIB6mgNgcCkTi6hStHtvn4zXowDatLvUvCY2ZDY6TB1LGU71J5b04OAvE036PzZE4RRCpE/b+mQyiHNoxi/Snq7EgrLSJdIVkEKK4feitGBpPK/HW0qGQqhDepPJgxdB85kw/rV8nHHGQodJEEPXTAFEspaeybr2Mzo2Ka1mnk+iBCNx1ukpsLxyne4joGrpsEHHWaeesgMixvNef7p8bRByJHgjcx+/Eq0qfe6tKuRXzOUDEkXBOwzSdBojsFe9+D1d+EDEkONPk94WjfR+uQTcpbt25He0pyQMieZpoeDHjpwGRp8/XEq8OAqKfBAcieJ6H33nAM0whncoFon+APXbuKzmJs5Y/GIhbEp1UMwiIPhI8iN4WDveT3cTIxnYih5GOB5JfdpRzWn7EY/tDXJ8IxOD7NZEIiFpW6yNCIqQR3O40STuf4O403yV890Ps7jQk5/qIiE7ErSot7wwGwhk6fB18BzM58sgltyPiSRSM0bCzZfs1Tc9cj7/6x8a9zoUEXWnMZezXlLZ6KrpSOm4N3aAaQerDaURhuK3kQiDMTBCRCoe2kkPjNBVsHDrIDma4Way3g9l+4g5mWSuGQksK2TR6okj8cs8BNaLG3zrdVrj8vYfYXBEtYW9dTLDQOzeJiMaCcVry9/qO3XX9m3gQ4Kf9neTmonv6lTlppK9H46yTrzzcugVJ1W8MGD6Y/K3T++66wXp5UB7BHXC7UTYnPNh/BT5wxIFI9K3rCnb6uT3deR6zu2IsiMm7gV26PXf4ul+8cSP76TohGfozcajKxUq3IBkZt7ZrvVsvCt5etfnGBgv+NDNn1/D20zXcfAXUimyj35itCP1eO7rva/+hNTEg8Cer/r6v0/19ho7ZK15WQwB1okCfft/ZOf72vbkrx6VNF3WMiUrO8XSi7EEmliDumEr+LamLuOsrTbvsqrqet4RaTZXi9h3G1NsJeb81EkXRDwI3fQ12QkaD1pd29PzFq9ZpwbhZAI63JXX+yvHPucsuVnJcrLFb4w4mAm6bXC7mSyWzJ0S7ahaLNbM7QEDhlnCP8liTze8NHkURBYF7gy9we4PHNjKIZpZwD/ZcDlav4U85z0orV9K74jBps2rWQDJa3lsX6e7kVKutxA7X6F79oUxkYg0UU8h4MEJSoy04RWhqqbF6nUcRAoEfj3O75cfqg188knd8xSYk4gwcuPihOGxyiJPz4ocWkdlWcuJZSVuBcKf2D1vb1CFTGt94k5Dx3FL4b2K1EZw0AQ3qz+Vc3zN0okrrYCp8ooqnAn+hGsEUZGGhBdoQELu/JYrnIE6dxGpjjjtsbmmvtbCwPU4nIaNp+h8BKRzMcWcMdVbPzxj6ICQmtkKnbs2xU7dWAcTCBj23lD91a2X//NStD0YClGIpcgwdnkN3b6Y1vRI5hw5c+uPzc+g+FAkITFcPl8InM061ZsJHZFJl6bQWzk9m/MAoFhpLc6lnlU4tHW5tf26HKZ/F03ufr7b2wqf39s4qnVqZO2hhQHV+eu9HUArvJOXeedYz3HnWLeGn8/OsP55W4EbUrY3G3sHS0tbM9Izwxz8e7DVarePtn8TzE94/Jgp6CKM4LhwvCAKuoTs+FgRW1rufI4YzC4LCuMhm6+NiRm+o9OJnSuFsg2AO4y52cQCIi5OfLYP/CyCoRjRyLO89B/FxQIyfgzgDIZTwxxHxHMQZSM+PhXMQ5+kcRKSBdw7iPJ04OdXuKYOw7RMVaPMUKkXsvB+eHQ67RtM+VRC2uzs7fHlmr709eaVs3e3HaS/vds8yiHfq97Ph4lZPBMJabqqmNXRxampz+cT6sKt+70anRm1CuWrkQ4vTtjeHr7nBPyhYXOskIIjbVM2hK2zVTwHEjqk23aiab7oxNeOK/fbK7Ck81teuDGv/SAwIciLT5OwOrxCiqJnuyU05Md3+icGOm3o8p/F99eT6oBvGsM8gKYVB2G7/PMD/B1GTbUrqyT2IVWcndQwFoigZWSVAEJbmum7FPw+WaPhW09peAUgX3pExS4bIpF2p0DmTtqxV3y67muxbTUvDXwWP6iapwrcW2zvEJhq+IzdIRSbsg2r37dtqxZ9+Sarucpc4tiXz6jbqaMtu1Z81uUm0LmYiQvEc7xYufG0TLJddqdCcHbnSfbu8rHEZPbW0kqTqmmZ7t7pWjYZYz3Yg7+VqcI6lQ6pQPE/qNq2KRrSipOh0b0MHKr+MZfG5WFW8etSXRBWlt4mv8OO2B8KCq1xvb0SnwqT9jFQg8yp9I+CqE6O5biglum7J0YuKsbYG75kRsvV6c21dqZvlYl0TFxUFT2shZlFprq01laLuGx2ahT/RGy4y1v1vrd06/Ngwat2yQhcrVE34dm3NUIoV3OfzmVYz1teb9ZpZq3MGxnbhV+tGne1XYi/XjeZaU61XdYXuKWl5X0O5IFNNoftfkTIrF7+TK5YVd+qsd71yYdXCxq1bMwwsj1d8AuVbW1Np6TehcFAVVcFMIJciEWWv8kadzdnfpOX35EUqJQXeqYouwseQKd1bAkHopmFAPtQ3QHHLUIRRtwQ5oejxiExRqzfrpllnS6iJaUiK6S6bCjv/ASAZpusWcbeusrypS9KihSZPKprLLvzIcJG4Vjd6WWAmTQPECt/qD8HBGyAXt66ud0uSBN9XDUmtuctuzft5xVDrbhcnwhdr2mbPG4HUd82it0tGtwnPowthlwt2BiS0s9s0oAQ1VVK+LBNRU3H1iwzlUsxlLLyht30QFTwut1SGbGzTUIsm5Kny+7hYLn66vFtX2Ux6q6aqteVdha4zgcJKJt6mWAYS5fKiLNe8mxhQmIfUA0FlofLU/2oK/n5XVc0qmLJduFI1ZVxKJinwqMEtaLADxS0RFBPKGuWGJzNCaFXT5HlShtI69JLF9uVHYxVWEJASXlkBvaxcfiXrqrR4FZd2KNp78dnRokGXYZE6ZrEjYxYWXV1Q13bmcU9JkDSesqCjzpiEgjiCPLDIl/GLchtPw6iDLsr4jpt/rcONLeKAWTF0S9zUqaSJaVYRxFMQEF2eTsvlPMKawSMGZVa0sUeX5xcVbnnYy/mypGpoFKHcNe3oqFIDcYxyIQ0W8BHB8uCTUaVSauuSWrZFTcIViY5e0mS8ldhGNErl7+8vgvOmixU1BSTUljUQuU7EioRr9hy9pqGoZFwAgUpUxJUllkV0g+4RiyDmRZrj1baNR8gWieA22QqjeepQZMVf0UelZpXZ5rKACZ9DeREwXaJFpXaLFQ6kZFCzRgWB9WXL6gjaZtkBPFXqe2TIEqqCWbW9n0OhQaRli6orv/6T1D1RajRPeALoRYTYePlL21TplvGgoiqefRiAYCsX0RT0whKoBP0x3J/tlIvmnvu66HlhBwRi7ohVFMgzrzwaFax4RDBPqOsjBOEttatjLsT0IlGNPpQMBE7qp5K7JGpgSPBaVeuJBIv75TyV9bwnRmlRAIWQwZFoehFlPf+tBwLlp9Oy07dYU1scWwTMYxwIWjWIkmvEAicKKoAIgAs4MnBNIPgSlZy3or8fRBHUSw2wFflzP7yVdg41Ra88EPRgHngPsmWbPoGgcLlxD4S/HJFby23RElxC0XrB9yJ/AhJK2DsTRsUiOC7dWq4SgCDBz8IgSviBrIBkoe6gqfjWA+E9unCPR7LsOWtalEV4cC55IKA8/0pBPAWL/6WgSHU8ON5oKuhKZR/EDgPhaQTIHk8ckQGEPiZ2eRAVvE3NLNXBFxk0C/jQLBXBxxng2vtAOD0Q36JuM8QMRG+rXO8hFpmlsCYDEJQjxVP1QezkAFFlUawfWyi4k0UfCKJgdV7ifXZG3RQQTKi08mjuIF4wmiC/EumBQLtgmBoJh6/WoqqibQ+DwFe3BEkC8ZVM09Uqsi3O+6bJZiBA8vTZQUG8SgCB7sTwsyBU3ka9VMO3EOE5GSCIwnw22Atuz+JiIMlZqvJ4f7mnIfgey/VMZ/oUA6Ib0Qg8L1fSYuL6Hgg0EfgL2YLAriklg3B6GuGqKL+aqbsQ2W/6pkykYQ7oSJnG2pAxU2BL50CAafrX4MYFAGGC+GwvyOiBYD4Wb68TDKLRbsSB0LD+ZoUEq7LgkiKYJuLtfY42Lg2EbEJumqyZai/SQbvt7zdHDDThgUY4zFuFy5UPRIkDoTZnY0DQAoK0IFSu1fKBQJ9cIbbjn7MUgBCJXlTZOkVOI/DnhAMx74NAjSjz5xFEQEBcgqcBQoBXeZYCosxvicfbmMsREBoz8j6IL2VqhiQI01V+NzdOI6o0OImCoOVSilguMScIiI5UrS/7kGmisq7UoChVJ81HhED4mYqXHonc70XxFaKgmkv85+oIfIR+1DNN3wY28Rb4CF9sRKv0aQSYArD8StFk24XocSA0pWdUutRHBLXUNNmOgHBCzhqfiEV2LoJm8Z0zPXseDwLaBLRcmpgAotfNJzMf4WCNLL/ivcCA0wiUBYTz+NCmOmurB4LdmaU3YRDg0CyIwiEGC0CMxYOAe/2bANLxDr/W6uZoVCOs3fVrRJbnmdGg7YijaNSEkveeiu4V03mqq35MQmp1S46Ypl7UNMZAaPViRa7IcuhcWF31KwSvyuRSFAS093aJXPHXgmr0lgEIOeSsieel4EdeFy26eCs2aiq3oekImbwKh68pIBR/b4Ox5SuzHAh71qbPMTqxZBDzXhSnlgWoKMsJWtg6bRlwIGQgyh+OgBrxMAwCoibMoupl4b6nTR4WkZrf1+Re1ESiPoIqo1WP68GuKl64ZlHK7QiIS1Auvic3Fwja0eDHO5rYBwLaEXAr1p7bjAUBD10UBFaKNiQszQBzGICQa+vXbFoyaH8mgijKgVcVLNrqq1bBntVJD0SbRk3Y6qybpq7rWtWSmY8gGMjwIDAjekauzmSKOyhA5KZBYxMqthMCobEGStsPIuex4kqN3qJa7YkW8wBFsaG9hK3gNovagqiJtoIhVNFdjW4NzUCg7PzIkgOBOokt6cvYFtYc29F7uz2Ivt8fJRbeyqKPkcZMYtg0oem4e7EHos3aWPA7qaZrmkn7IAJwpE6DD9QIrWcqx3QfBPwK26oVx8aWtaET4aVWp5uOgzwqF3vOWqY6Be14VfKOvzVM8hDlYYd8hOQVmv5GqmveOAjLEXcYlstqWCNMPxJlPoJtwMDuUKuGSCimif0+lhgCgeXC/iH/VF48zVajPhEyrPkgVG4oCLtkdt+8Ee1deFHbhTzr1VAftWTUdnfrKm0jW9ix5M4u11kbWPL3+sHuieLyG3tW5UBodJzCKwnta/LBwc9VxVzeNbD8cAs2VHqE9QDb/j2CkLEzsrZrwo2h8SrgJhkG5oM9PgDSqDPTpK+vd1mXFiSUKtzJWV5bd4/E2bUm6yYlNa9/xMvC730lJn1Lz2bAjGa9T5vNKpRwfX15kxkyoybTPToUegcEyZMw1GaT9V6Kr9y1teWnrFN2fa1LN7zwy4W9bV0oF4HCNz0QZnPNDo3pqGtXrhHag9WETGv8OBF2VdSb9Fa2d7G67vebVptNP5jDAq1deftmzbsJdm0S1tXsPaeUeTM4eQ/utcbuZdWaa8x7u+tNdxMFWKYgFAVuzOJFgXbSo2Ggub+yZq0bnrNBbwOihnAdT+aGYoC6z86iTr+Z9QvXtdpexBVkwaaPoDUjzKrTjGgVZ2fBQoz670erXesySqmmkSrcQodHdZcTn6a7wRiH/eaNlwlkh1m9W3ctgseDm9SbQLleivKsXy5r9k3Y5bjL1GJvEhxrqYZ6wQGEUa26ejCc4nR1NxieCLLESrmgEb3KW90u7Tp8aNHKs5i2Ww1OLSIu3sui4w5+eWyW35suoSCKFSqodm+Erp002Nr0O2UsM33/oUuRLNrtfKNXoHJaz4Tshr67/DRxWkTzmhWMv0k59h8J9r+6cTlaRzr01g7tnfH00bO4TC5fTsj9VXxlHz1KKxKNlkX5UZ6hUtpcefb06VPqD+onGK9OHEWs4+DA5qunrHsm5+QCVw32TQOncbJykROMgZ4oBf44GwRuqsU04pIDT677AUoDoYPnGDZn36nvnNwgTP+l0XQ3TwjCsD4FCKLwR8CngnilNzGUmZ2dXX5nGLvOhyhNUcIBuu7s7LUrzdyzXqpQrnfLs/bs2yvN5rWTTQ2xAITzqUDk1AhRvIaBCXj2tfUryx+mtFWMOQyjuQZxTe47ONeaeE0Topsrb084Rcepq1c+yYRNeALyg7D00pcFCO/euR+srNVy8VsIqOsDTea0NLOunE657HfGlU9impx3BrcV6v8CmyQZpskaue0AAAAASUVORK5CYII=";

const ENORPA_LOGO_YAZISIZ_URI = "data:image/png;base64,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";

/* Kalite belgesi bilgileri: form revize edildiğinde yalnızca burayı güncelleyin */
export const FORM_BILGI = { dokumanNo: "S-FOR-001", yayinTarihi: "20.04.2017", revizyonNo: "002", revizyonTarihi: "09.05.2023" };

export function sablonHTML(d, _logoKullanilmiyor, o = {}) {
  const ac = o.ac !== undefined ? o.ac : d.aciklama, fs = o.fs || 13, sayfa = o.sayfa || 1, toplam = o.toplam || 1;
  const tr = new Date(d.tarih + "T12:00:00").toLocaleDateString("tr-TR");
  const cols = (...w) => `<colgroup>${w.map(x => `<col${x ? ` style="width:${x}"` : ""}>`).join("")}</colgroup>`;
  const kutuHTML = on => `<i class="b">${on ? "✕" : ""}</i>`;
  const cihazSatir = a => `<tr>${a.map(x => `<td class="ck">${esc(x)} ${kutuHTML(d.cihaz.includes(x))}</td>`).join("")}</tr>`;
  const servisHucre = x => `<td class="ck sr">${x} ${kutuHTML(d.servis.includes(x))}</td>`;
  const alan = (etiket, deger) => `<td class="fl"><div class="fx"><span>${etiket}</span><span class="fd">${kir(deger)}</span></div></td>`;

  return `<div class="pf"><style>
.pf{width:794px;height:1123px;padding:34px 38px 24px 42px;background:#fff;color:#222;font:12px Arial,Helvetica,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}
.pf *{box-sizing:border-box}
.pf > *{flex:0 0 auto}
.pf table{width:100%;border-collapse:collapse;table-layout:fixed}
.pf td{border-top:1px solid #777;padding:3px 6px;vertical-align:middle;overflow-wrap:break-word;word-wrap:break-word;word-break:normal;min-width:0;font-size:12px}
.pf tr:first-child td{border-top:none}
.pf .lb{text-align:right;color:#555;font-size:11px;border-left:1px solid #777;white-space:nowrap}
.pf td:not(.lb):not(.ck):not(.fl){color:#111;font-weight:500}
.pf .lb:first-child{border-left:none}
.pf .bx{border:1.5px solid #444}
.pf .bh{text-align:center;font-weight:700;font-size:11px;letter-spacing:.3px;padding:3px 0;border-bottom:1px solid #777;background:#f3f3f3;color:#222}
.pf .sec{margin-top:13px}
.pf .b{display:inline-block;width:13px;height:13px;border:1.4px solid #c0504d;background:#fff;border-radius:3px;vertical-align:-3px;text-align:center;font:700 10px/10px Arial;color:#c0504d;font-style:normal;overflow:hidden}
.pf .t2 tr:first-child td{border-top:1px solid #777}
.pf .ck{text-align:center;white-space:nowrap;font-size:11.5px;color:#333;padding:4px 2px}
.pf .sr{text-align:right;padding-right:12px}
.pf .fl{padding:3px 8px 3px 4px}
.pf .fx{display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:11.5px;color:#333}
.pf .fd{display:block;flex:0 0 108px;min-height:15px;background:#ececec;border-radius:3px;padding:1px 6px;color:#222;font-size:11.5px;overflow:hidden}
.pf .hd{display:flex;border:1.5px solid #444;border-radius:15px 15px 0 0;overflow:hidden;height:98px}
.pf .hd > div{min-width:0}
.pf .hd-lg{flex:0 0 216px;border-right:1px solid #777;display:flex;flex-direction:column;justify-content:center;padding:0 14px}
.pf .hd-tt{flex:1 1 0;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;padding:12px 4px 8px}
.pf .hd-mt{flex:0 0 190px;border-left:1px solid #777}
.pf .hd-mt td{padding:0 6px;height:19.4px;font-size:10.5px;border-top:1px solid #777}
.pf .hd-mt td:first-child{color:#333;border-right:1px solid #777}
.pf .grid-kutu{flex:1 1 0;min-height:80px;display:flex;flex-direction:column;border:1.5px solid #444;overflow:hidden}
.pf .grid-kutu .bh{flex:0 0 auto}
.pf .grid{flex:1 1 0;min-height:60px;overflow:hidden;padding:4px 10px;white-space:pre-wrap;overflow-wrap:break-word;word-wrap:break-word;line-height:20px;color:#111;background-color:#fff;background-image:linear-gradient(#e2e2e2 1px,transparent 1px),linear-gradient(90deg,#ececec 1px,transparent 1px);background-size:10px 10px;background-position:0 3px}
.pf .bx2{border:1.5px solid #444;border-radius:0 0 15px 15px;display:flex;flex-direction:column;min-height:122px}
.pf .sg{display:flex;flex:1 1 auto}
.pf .sg > div{flex:1 1 0;min-width:0;text-align:center;padding:8px 6px 0;color:#333;font-size:11.5px;line-height:1.35}
.pf .sg .v{color:#111;font-weight:600;font-size:12px;margin-top:6px;overflow-wrap:break-word}
.pf .imza-alan{height:46px;margin:4px 14px 0;border-bottom:1px dashed #999;display:flex;align-items:flex-end;justify-content:center}
.pf .imza-alan img{max-height:42px;max-width:100%;object-fit:contain}
.pf .ft{display:flex;justify-content:center;align-items:center;gap:6px;padding:4px 0 9px}
</style>

<div class="hd">
  <div class="hd-lg">
    <img src="${ENORPA_LOGO_URI}" style="width:180px;display:block" alt="">
  </div>
  <div class="hd-tt">
    <div style="font-weight:700;font-size:15px;line-height:1.5">BAKIM ve/veya<br>SERVİS İŞ EMRİ FORMU</div>
    <div style="font-size:12px;color:#333">İş Emri No.: <span style="color:#c0504d;font-size:17px;font-weight:600;letter-spacing:2.5px;margin-left:6px">${kir(d.no, 12)}</span></div>
  </div>
  <div class="hd-mt">
    <table>
      ${cols("96px", "")}
      <tr><td>Doküman No.</td><td>${esc(FORM_BILGI.dokumanNo)}</td></tr>
      <tr><td>Yayın Tarihi</td><td>${esc(FORM_BILGI.yayinTarihi)}</td></tr>
      <tr><td>Revizyon No.</td><td>${esc(FORM_BILGI.revizyonNo)}</td></tr>
      <tr><td>Revizyon Tarihi</td><td>${esc(FORM_BILGI.revizyonTarihi)}</td></tr>
      <tr><td>Sayfa No.</td><td>${sayfa}/${toplam}</td></tr>
    </table>
  </div>
</div>

<div class="bx sec">
  <div class="bh">Müşteri Bilgileri</div>
  <table>
    ${cols("66px", "40%", "56px", "")}
    <tr><td class="lb">Firma</td><td>${kir(d.firma)}</td><td class="lb">Adres</td><td>${kir(d.adres, 18)}</td></tr>
    <tr><td class="lb">Yetkili</td><td>${kir(d.yetkili)}</td><td class="lb">Gsm</td><td>${kir(d.gsm)}</td></tr>
  </table>
</div>

<div class="bx sec">
  <div class="bh">Cihaz Bilgileri</div>
  <table>
    ${cols("14.28%", "14.29%", "14.29%", "14.29%", "14.28%", "14.29%", "14.28%")}
    ${cihazSatir(CIHAZ.slice(0, 7))}
    ${cihazSatir(CIHAZ.slice(7, 14))}
  </table>
  <table class="t2">
    ${cols("124px", "", "108px", "150px")}
    <tr><td class="lb">Diğer Marka / Model</td><td>${kir(d.marka)}</td><td class="lb">Kazan Kapasitesi</td><td>${kir(d.kapasite)}</td></tr>
    <tr><td class="lb">Kazan Seri Numarası</td><td>${kir(d.seri)}</td><td class="lb">Proje Numarası</td><td>${kir(d.proje)}</td></tr>
  </table>
</div>

<div class="bx sec">
  <div class="bh">Servis Bilgileri</div>
  <table>
    ${cols("14%", "14%", "14%", "30%", "")}
    <tr>${servisHucre("Arıza")}${servisHucre("Keşif")}${servisHucre("Ücretli")}${alan("Başlama Saati", d.basla)}${alan("Gidiş Km", d.gidis)}</tr>
    <tr>${servisHucre("Kurulum")}${servisHucre("Bakım")}${servisHucre("Garantili")}${alan("Bitiş Saati", d.bitis)}${alan("Dönüş Km", d.donus)}</tr>
  </table>
</div>

<div class="grid-kutu sec"><div class="bh">Yapılan İşlemler / Açıklama</div><div class="grid" style="font-size:${fs}px">${kir(ac, 16)}</div></div>

<div class="bx sec">
  <div class="bh">Personeller</div>
  <table>
    ${cols("33.34%", "33.33%", "33.33%")}
    <tr><td style="min-height:22px">1. ${kir(d.p[0])}</td><td>3. ${kir(d.p[2])}</td><td>5. ${kir(d.p[4])}</td></tr>
    <tr><td>2. ${kir(d.p[1])}</td><td>4. ${kir(d.p[3])}</td><td>6. ${kir(d.p[5])}</td></tr>
  </table>
</div>

<div class="bx2 sec">
  <div class="sg">
    <div>Servis Sorumlusu<br>Ad, Soyad, İmza<div class="v">${kir(d.sorumlu)}</div><div class="imza-alan">${d.imzaSorumlu ? `<img src="${d.imzaSorumlu}" alt="">` : ""}</div></div>
    <div>Tarih<div class="v">${tr}</div></div>
    <div>Müşteri / Firma<br>Ad, Soyad, Tarih, İmza<div class="v">${kir(d.musteri)}</div><div class="imza-alan">${d.imza ? `<img src="${d.imza}" alt="">` : ""}</div></div>
  </div>
  <div class="ft">
    <img src="${ENORPA_LOGO_YAZISIZ_URI}" style="width:92px;display:block" alt="">
    <div style="font-size:7px;line-height:1.25;color:#444;text-align:left;letter-spacing:.2px">GREENHOUSE<br><span style="color:#c0504d">HEATING</span> SYSTEMS</div>
  </div>
</div>
<div style="font-size:9.5px;text-align:left;margin-top:6px;color:#333">* 3 Nüsha düzenlenir, Otocopylidir.</div>
</div>`;
}

export const gorselleriBekle = async kok => {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
  await Promise.all([...kok.querySelectorAll("img")].map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())));
};

/* Açıklama metnini ölçerek sayfalara böler (gerçek tarayıcı yerleşimiyle) */
export async function aciklamayiSayfala(d, logoHTML) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden";
  wrap.innerHTML = sablonHTML(d, logoHTML, { ac: "" });
  document.body.appendChild(wrap);
  try {
    await gorselleriBekle(wrap);
    const grid = wrap.querySelector(".grid");
    const sigar = (txt, fs) => { grid.style.fontSize = fs + "px"; grid.innerHTML = kir(txt, 16); return grid.scrollHeight <= grid.clientHeight + 1; };
    const metin = d.aciklama || "";
    for (const fs of [13, 12, 11]) if (sigar(metin, fs)) return { fs, parcalar: [metin] };

    const fs = 13, ch = Array.from(metin), parcalar = [];
    let bas = 0;
    while (bas < ch.length && parcalar.length < 30) {
      let lo = 0, hi = ch.length - bas;
      if (sigar(ch.slice(bas).join(""), fs)) { parcalar.push(ch.slice(bas).join("")); bas = ch.length; break; }
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (sigar(ch.slice(bas, bas + mid).join(""), fs)) lo = mid; else hi = mid - 1;
      }
      let n = Math.max(lo, 1);
      const kes = ch.slice(bas, bas + n);
      const son = Math.max(kes.lastIndexOf("\n"), kes.lastIndexOf(" "));
      if (bas + n < ch.length && son > n * 0.5) n = son + 1;
      parcalar.push(ch.slice(bas, bas + n).join("").replace(/\s+$/, ""));
      bas += n;
      while (bas < ch.length && /\s/.test(ch[bas])) bas++;
    }
    return { fs, parcalar: parcalar.length ? parcalar : [""] };
  } finally { wrap.remove(); }
}
