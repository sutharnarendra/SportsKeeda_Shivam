package com.yatrax.service;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import com.yatrax.model.Order;
import com.yatrax.model.OrderItem;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    // Decoupled: Loads out HTML file directly from the resources folder!
    @Value("classpath:templates/email-template.html")
    private Resource emailTemplate;

    @Value("classpath:templates/order-template.html")
    private Resource orderTemplate;

    // Reads the HTML template file and replaces the double-curly placeholders
    private String buildVerificationHtml(String name, String otp, String link) {
        try {
            String htmlContent = StreamUtils.copyToString(emailTemplate.getInputStream(), StandardCharsets.UTF_8);
            return htmlContent
                    .replace("{{name}}", name)
                    .replace("{{otp}}", otp)
                    .replace("{{link}}", link);
        } catch (IOException e) {
            logger.error("Failed to load email template file! Falling back to plain text: {}", e.getMessage());
            return "Hello " + name + ", your Yatra X verification OTP code is: " + otp;
        }
    }

    private String buildOrderConfirmationHtml(Order order) {
        try {
            String htmlContent = StreamUtils.copyToString(orderTemplate.getInputStream(), StandardCharsets.UTF_8);
            
            StringBuilder itemsHtml = new StringBuilder();
            for (OrderItem item : order.getItems()) {
                String variantText = item.getVariantInfo() != null ? " (" + item.getVariantInfo() + ")" : "";
                itemsHtml.append("<tr>")
                        .append("<td>").append(item.getProductName()).append(variantText).append("</td>")
                        .append("<td>").append(item.getQuantity()).append("</td>")
                        .append("<td style=\"text-align: right;\">$").append(item.getProductPrice()).append("</td>")
                        .append("</tr>");
            }

            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            String orderDateStr = order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : java.time.LocalDateTime.now().format(formatter);

            return htmlContent
                    .replace("{{name}}", order.getUser().getName())
                    .replace("{{orderId}}", String.valueOf(order.getId()))
                    .replace("{{orderDate}}", orderDateStr)
                    .replace("{{paymentMethod}}", order.getPaymentMethod())
                    .replace("{{orderItems}}", itemsHtml.toString())
                    .replace("{{total}}", String.valueOf(order.getTotal()))
                    .replace("{{shippingName}}", order.getShippingName())
                    .replace("{{shippingAddress}}", order.getShippingAddress())
                    .replace("{{shippingCity}}", order.getShippingCity())
                    .replace("{{shippingState}}", order.getShippingState())
                    .replace("{{shippingPincode}}", order.getShippingPincode())
                    .replace("{{shippingPhone}}", order.getShippingPhone());
        } catch (IOException e) {
            logger.error("Failed to load order email template file! Falling back to plain text: {}", e.getMessage());
            return "Hello " + order.getUser().getName() + ", your Yatra X order #" + order.getId() + " is confirmed. Total: $" + order.getTotal();
        }
    }

    public void sendVerificationEmail(String recipientEmail, String name, String otp) {
        // 1. Generate the verification link URL
        String verificationLink = "";
        try {
            verificationLink = backendUrl + "/api/auth/verify-link?email=" +
                    java.net.URLEncoder.encode(recipientEmail, java.nio.charset.StandardCharsets.UTF_8.toString()) +
                    "&code=" + otp;
        } catch (Exception e) {
            verificationLink = backendUrl + "/api/auth/verify-link?email=" +
                    recipientEmail + "&code=" + otp;
        }

        // 2. Pass teh generated link as the third argument here
        String htmlContent = buildVerificationHtml(name, otp, verificationLink);

        // Fallback: Log email to console if SMTP sender is not configured
        if (senderEmail == null || senderEmail.contains("placeholder") || senderEmail.isBlank()) {
            logger.info("===============================================================");
            logger.info(" EMAIL FALLBACK (SMTP not configured)");
            logger.info(" FROM: onboarding@resend.dev (Yatra X Security)");
            logger.info(" TO: {}", recipientEmail);
            logger.info(" SUBJECT: Verify your Yatra X Account");
            logger.info(" SECURITY OTP CODE: [ {} ]", otp);
            logger.info(" DIRECT VERIFY LINK: {}", verificationLink);
            logger.info("===============================================================");
            return;
        }

        // Live mode: Send real email using Gmail SMTP
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail, "Yatra X Security");
            helper.setTo(recipientEmail);
            helper.setSubject("Verify Your Yatra X Account");
            helper.setText(htmlContent, true); // Enable HTML rendering

            mailSender.send(message);
            logger.info("Real verification email successfully sent to {}", recipientEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            logger.error("Failed to send real email to {}: {}", recipientEmail, e.getMessage());
            logger.info("FALLBACK OTP LOG (Mail Server Error): [ {} ]", otp);
        }
    }

    public void sendOrderConfirmationEmail(Order order) {
        String recipientEmail = order.getUser().getEmail();
        String htmlContent = buildOrderConfirmationHtml(order);

        // Fallback: Log email to console if SMTP sender is not configured
        if (senderEmail == null || senderEmail.contains("placeholder") || senderEmail.isBlank()) {
            logger.info("===============================================================");
            logger.info(" EMAIL FALLBACK (SMTP not configured)");
            logger.info(" FROM: onboarding@resend.dev (Yatra X)");
            logger.info(" TO: {}", recipientEmail);
            logger.info(" SUBJECT: Yatra X Order Confirmation - #{}", order.getId());
            logger.info(" TOTAL AMOUNT: ${}", order.getTotal());
            logger.info("===============================================================");
            return;
        }

        // Live mode: Send real email using Gmail SMTP
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail, "Yatra X");
            helper.setTo(recipientEmail);
            helper.setSubject("Yatra X Order Confirmation - #" + order.getId());
            helper.setText(htmlContent, true); // Enable HTML rendering

            mailSender.send(message);
            logger.info("Real order confirmation email successfully sent to {}", recipientEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            logger.error("Failed to send real order confirmation email to {}: {}", recipientEmail, e.getMessage());
            throw new RuntimeException("Email sending failed", e);
        }
    }
}
