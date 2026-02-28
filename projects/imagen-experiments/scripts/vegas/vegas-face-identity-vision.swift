#!/usr/bin/env swift

import AppKit
import Foundation
import Vision

struct FaceIdentityResult: Codable {
    let reference_face_detected: Bool
    let candidate_face_detected: Bool
    let distance: Float?
    let error: String?
}

enum FaceIdentityError: Error, LocalizedError {
    case loadFailed(String)
    case noFaceDetected(String)
    case cropFailed(String)
    case featurePrintFailed(String)

    var errorDescription: String? {
        switch self {
        case .loadFailed(let value): return value
        case .noFaceDetected(let value): return value
        case .cropFailed(let value): return value
        case .featurePrintFailed(let value): return value
        }
    }
}

func emitResult(_ result: FaceIdentityResult) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(result), let text = String(data: data, encoding: .utf8) {
        print(text)
    } else {
        print("{\"candidate_face_detected\":false,\"distance\":null,\"error\":\"encode_failure\",\"reference_face_detected\":false}")
    }
    exit(0)
}

func loadCGImage(from url: URL) throws -> CGImage {
    guard let image = NSImage(contentsOf: url) else {
        throw FaceIdentityError.loadFailed("load_failed:\(url.path)")
    }
    var rect = CGRect(origin: .zero, size: image.size)
    guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        throw FaceIdentityError.loadFailed("cgimage_failed:\(url.path)")
    }
    return cgImage
}

func detectLargestFaceRect(in cgImage: CGImage) throws -> CGRect {
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try handler.perform([request])
    let observations = request.results ?? []
    guard let largest = observations.max(by: { ($0.boundingBox.width * $0.boundingBox.height) < ($1.boundingBox.width * $1.boundingBox.height) }) else {
        throw FaceIdentityError.noFaceDetected("no_face_detected")
    }

    let width = CGFloat(cgImage.width)
    let height = CGFloat(cgImage.height)
    let raw = CGRect(
        x: largest.boundingBox.origin.x * width,
        y: (1 - largest.boundingBox.origin.y - largest.boundingBox.height) * height,
        width: largest.boundingBox.width * width,
        height: largest.boundingBox.height * height
    )

    let expandX = raw.width * 0.35
    let expandY = raw.height * 0.45
    let expanded = raw
        .insetBy(dx: -expandX, dy: -expandY)
        .intersection(CGRect(x: 0, y: 0, width: width, height: height))
        .integral

    guard expanded.width > 4, expanded.height > 4 else {
        throw FaceIdentityError.cropFailed("invalid_face_crop")
    }

    return expanded
}

func cropFaceImage(from cgImage: CGImage) throws -> CGImage {
    let faceRect = try detectLargestFaceRect(in: cgImage)
    guard let cropped = cgImage.cropping(to: faceRect) else {
        throw FaceIdentityError.cropFailed("face_crop_failed")
    }
    return cropped
}

func extractFeaturePrint(from faceImage: CGImage) throws -> VNFeaturePrintObservation {
    let request = VNGenerateImageFeaturePrintRequest()
    let handler = VNImageRequestHandler(cgImage: faceImage, options: [:])
    try handler.perform([request])
    guard let featurePrint = request.results?.first as? VNFeaturePrintObservation else {
        throw FaceIdentityError.featurePrintFailed("feature_print_failed")
    }
    return featurePrint
}

func computeDistance(referencePath: String, candidatePath: String) -> FaceIdentityResult {
    var referenceDetected = false
    var candidateDetected = false
    var referencePrint: VNFeaturePrintObservation?
    var candidatePrint: VNFeaturePrintObservation?
    var firstError: String?

    do {
        let refImage = try loadCGImage(from: URL(fileURLWithPath: referencePath))
        let refFace = try cropFaceImage(from: refImage)
        referencePrint = try extractFeaturePrint(from: refFace)
        referenceDetected = true
    } catch {
        firstError = error.localizedDescription
    }

    do {
        let candidateImage = try loadCGImage(from: URL(fileURLWithPath: candidatePath))
        let candidateFace = try cropFaceImage(from: candidateImage)
        candidatePrint = try extractFeaturePrint(from: candidateFace)
        candidateDetected = true
    } catch {
        if firstError == nil { firstError = error.localizedDescription }
    }

    guard let ref = referencePrint, let cand = candidatePrint else {
        return FaceIdentityResult(
            reference_face_detected: referenceDetected,
            candidate_face_detected: candidateDetected,
            distance: nil,
            error: firstError ?? "feature_print_unavailable"
        )
    }

    do {
        var distance: Float = 0
        try ref.computeDistance(&distance, to: cand)
        return FaceIdentityResult(
            reference_face_detected: referenceDetected,
            candidate_face_detected: candidateDetected,
            distance: distance,
            error: nil
        )
    } catch {
        return FaceIdentityResult(
            reference_face_detected: referenceDetected,
            candidate_face_detected: candidateDetected,
            distance: nil,
            error: "distance_compute_failed:\(error.localizedDescription)"
        )
    }
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    emitResult(FaceIdentityResult(
        reference_face_detected: false,
        candidate_face_detected: false,
        distance: nil,
        error: "usage:swift vegas-face-identity-vision.swift <reference_image> <candidate_image>"
    ))
}

let result = computeDistance(referencePath: args[1], candidatePath: args[2])
emitResult(result)
